data "azurerm_client_config" "current" {}

data "azuread_service_principal" "app_service_rp" {
  client_id = "abfa0a7c-a6b6-4736-8310-5855508787cd"
}

resource "azurerm_role_assignment" "uami-blob" {
  scope                = module.az-stra[0].stra_id.0
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.az-core.msid_principal_id

}

# -----------------------------------------------------------------------------
# Function App host storage (AzureWebJobsStorage) over the UAMI - see main.fnap.tf.
# Microsoft's minimum for the host connection is Storage Blob Data Owner; Queue
# and Table Data Contributor cover host diagnostics events and any queue-backed
# features. Blob Data Contributor above stays for the deployment container.
# -----------------------------------------------------------------------------
resource "azurerm_role_assignment" "msid-stra-blob-owner" {
  scope                = module.az-stra[0].stra_id.0
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = module.az-core.msid_principal_id
}

resource "azurerm_role_assignment" "msid-stra-queue-contributor" {
  scope                = module.az-stra[0].stra_id.0
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = module.az-core.msid_principal_id
}

resource "azurerm_role_assignment" "msid-stra-table-contributor" {
  scope                = module.az-stra[0].stra_id.0
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = module.az-core.msid_principal_id
}

# The host reads secrets from storage at startup; let the roles land before the
# app-settings fix-up restarts it.
resource "time_sleep" "stra_rbac_propagation" {
  create_duration = "90s"

  depends_on = [
    azurerm_role_assignment.msid-stra-blob-owner,
    azurerm_role_assignment.msid-stra-queue-contributor,
    azurerm_role_assignment.msid-stra-table-contributor,
  ]

  triggers = {
    owner_id = azurerm_role_assignment.msid-stra-blob-owner.id
  }
}

# -----------------------------------------------------------------------------
# Key Vault access — RBAC (data-plane) instead of access policies.
# The vault sets rbac_authorization_enabled = true (see modules/az-core/kyvt.tf),
# so the access-policy blocks are replaced by role assignments scoped to the vault.
#
# Permission → built-in role mapping:
#   full key/secret/cert admin            -> Key Vault Administrator
#   secret Get/List                       -> Key Vault Secrets User
#   secret full management (Set/Delete/…) -> Key Vault Secrets Officer
#   certificate Get/List                  -> Key Vault Certificate User
#   certificate full management           -> Key Vault Certificates Officer
# -----------------------------------------------------------------------------

# TF Apply managed identity — full Key Vault admin (keys + secrets + certs)
resource "azurerm_role_assignment" "uami-kyvt-admin" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = "<MiID>" #TF Apply MI

}

# TF Plan managed identity — read-only secrets + certificates
resource "azurerm_role_assignment" "uami-kyvt-secret-user" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = "<MiID>" # TF Plan MI
}

resource "azurerm_role_assignment" "uami-kyvt-cert-user" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Certificate User"
  principal_id         = "<MiID>" # TF Plan MI
}

# slasql managed identity — full secret + certificate management
resource "azurerm_role_assignment" "msid-kyvt-secret-officer" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = module.az-core.msid_principal_id
}

resource "azurerm_role_assignment" "msid-kyvt-cert-officer" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = module.az-core.msid_principal_id
}

# My identity — full secret + certificate management (was: Key Vault Secrets Officer)
resource "azurerm_role_assignment" "ba-kyvt-secret-officer" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = "<ObjectID>"
}

resource "azurerm_role_assignment" "ba-kyvt-cert-officer" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = "<ObjectID>"
}

# Web app system identity — read-only secrets + certificates
resource "azurerm_role_assignment" "wapp-kyvt-secret-user" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.az-wapp[0].wapp_identity_principal_id
}

resource "azurerm_role_assignment" "wapp-kyvt-cert-user" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Certificate User"
  principal_id         = module.az-wapp[0].wapp_identity_principal_id
}

# Logic App system identity — read-only secrets (resolves the FUNCTION_JOB_KEY Key Vault reference).
# Deliberately NOT in time_sleep.kyvt_rbac_propagation's depends_on: the Logic App depends on the
# job-key secret, which depends on that sleep — adding this would close a cycle. The Logic App
# resolves the reference at runtime, so propagation only has to beat the first Saturday run.
resource "azurerm_role_assignment" "lgaps-kyvt-secret-user" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.az-lgaps[0].lgap_identity_principal_id
}

# App Service resource provider SP — read-only secrets + certificates
# App service appId - https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-certificate?tabs=apex%2Crbac%2Cazure-cli
resource "azurerm_role_assignment" "apsp-kyvt-secret-user" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = data.azuread_service_principal.app_service_rp.object_id
}

resource "azurerm_role_assignment" "apsp-kyvt-cert-user" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Certificate User"
  principal_id         = data.azuread_service_principal.app_service_rp.object_id
}

resource "time_sleep" "kyvt_rbac_propagation" {
  create_duration = "120s"

  # Wait starts only after ALL of these exist
  depends_on = [
    azurerm_role_assignment.uami-kyvt-admin,
    azurerm_role_assignment.msid-kyvt-secret-officer,
    azurerm_role_assignment.msid-kyvt-cert-officer,
    azurerm_role_assignment.uami-kyvt-secret-user,
    azurerm_role_assignment.uami-kyvt-cert-user,
    azurerm_role_assignment.ba-kyvt-secret-officer,
    azurerm_role_assignment.ba-kyvt-cert-officer,
    azurerm_role_assignment.apsp-kyvt-secret-user,
    azurerm_role_assignment.apsp-kyvt-cert-user,
    azurerm_role_assignment.wapp-kyvt-secret-user,
    azurerm_role_assignment.wapp-kyvt-cert-user,
  ]
  # Re-run the wait if any assignment is replaced (e.g. principal changes)
  triggers = {
    admin_id = azurerm_role_assignment.uami-kyvt-admin.id
  }
}
