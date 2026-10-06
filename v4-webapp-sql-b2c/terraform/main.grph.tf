# -----------------------------------------------------------------------------
# V4 profile page - the Function App's credential for Microsoft Graph in the
# External ID tenant.
#
# A managed identity can only be federated to an app registration in ITS OWN
# tenant, and External ID tenants only allow single-tenant apps, so the UAMI
# cannot get an external-tenant Graph token directly. Instead:
#
#   1. Key Vault generates a self-signed certificate with a NON-EXPORTABLE key.
#   2. terraform-identity/ uploads its public half to the 'graph' app
#      registration (reads output grph_certificate via remote state).
#   3. At runtime the Function builds a client-assertion JWT and asks Key Vault
#      to SIGN it, authenticating with the UAMI (Key Vault Crypto User on this
#      one key). The private key never leaves Key Vault; no secret exists.
#
# Apply order, fresh environment: identity -> main -> identity again.
# Rotation: taint/replace the certificate, apply main, apply identity.
# -----------------------------------------------------------------------------

locals {
  grph = {
    certificate_name = "graph-client-assertion"
  }
}

# The cert must NOT wait on time_sleep.kyvt_rbac_propagation: that sleep depends on
# the Web App's role assignments, the Web App depends on the Function App
# (API_PROXY_TARGET), and the Function App's settings depend on this cert - a cycle.
# Creating the cert only needs the TF Apply identity's Key Vault Administrator role.
resource "time_sleep" "kyvt_admin_propagation" {
  create_duration = "120s"

  depends_on = [azurerm_role_assignment.uami-kyvt-admin]

  triggers = {
    admin_id = azurerm_role_assignment.uami-kyvt-admin.id
  }
}

resource "azurerm_key_vault_certificate" "graph-assertion" {
  name         = local.grph.certificate_name
  key_vault_id = module.az-core.kyvt_id

  certificate_policy {
    issuer_parameters {
      name = "Self"
    }

    key_properties {
      exportable = false # the point: the private key can only be USED, via the sign operation
      key_size   = 2048
      key_type   = "RSA"
      reuse_key  = false
    }

    # No auto-renew: a renewed cert would have a new thumbprint that Entra does not
    # know until terraform-identity is applied again. Rotation stays a Terraform action.
    lifetime_action {
      action {
        action_type = "EmailContacts"
      }

      trigger {
        days_before_expiry = 30
      }
    }

    secret_properties {
      content_type = "application/x-pkcs12"
    }

    x509_certificate_properties {
      subject            = "CN=${local.namingconstant}-graph-appr"
      validity_in_months = 12
      key_usage          = ["digitalSignature"]
      extended_key_usage = ["1.3.6.1.5.5.7.3.2"] # client authentication
    }
  }

  tags = local.default_tags

  depends_on = [
    module.az-core,
    time_sleep.kyvt_admin_propagation,
  ]
}

# Least privilege: Crypto User (sign/verify) on THIS key only - not the vault.
resource "azurerm_role_assignment" "msid-grph-key-crypto-user" {
  scope                = "${module.az-core.kyvt_id}/keys/${azurerm_key_vault_certificate.graph-assertion.name}"
  role_definition_name = "Key Vault Crypto User"
  principal_id         = module.az-core.msid_principal_id
}

locals {
  grph_app_settings = merge(
    {
      GRAPH_TENANT_ID       = local.idn.tenant_id
      GRAPH_AUTHORITY_HOST  = "https://login.microsoftonline.com" # AzureActiveDirectory NSG service tag (AllowEntraOutbound)
      GRAPH_CERT_KEY_ID     = "${module.az-core.kyvt_vault_uri}keys/${azurerm_key_vault_certificate.graph-assertion.name}/${azurerm_key_vault_certificate.graph-assertion.version}"
      GRAPH_CERT_THUMBPRINT = azurerm_key_vault_certificate.graph-assertion.thumbprint
      PHOTO_CONTAINER       = "profile-photos"
    },
    # Absent until terraform-identity has created the graph app; the API then
    # answers the profile routes with 503 "not configured" instead of failing.
    { for k, v in { GRAPH_CLIENT_ID = local.idn.graph_client_id } : k => v if v != null },
  )
}
