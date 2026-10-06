
data "terraform_remote_state" "tenant" {
  backend   = "azurerm"
  workspace = terraform.workspace

  config = {
    resource_group_name  = "<RgName>"
    storage_account_name = "<StorageAccountName>"
    container_name       = "<ContainerName>"
    key                  = "slab2c-tenant.tfstate"
    use_azuread_auth     = true
  }
}

# Main root (terraform/) - read for ONE value: the public half of the Key Vault
# certificate the Function App signs Graph client assertions with (main.grph.tf).
# This reverses the usual direction (main reads identity), so it must tolerate
# the main root not having that output yet: `defaults` makes the first pass a
# no-op and main.grant.tf only uploads the certificate once it exists.
# Order for a fresh environment: identity -> main -> identity again.
data "terraform_remote_state" "main" {
  backend   = "azurerm"
  workspace = terraform.workspace

  config = {
    resource_group_name  = "<RgName>"
    storage_account_name = "<StorageAccountName>"
    container_name       = "<ContainerName>"
    key                  = "slab2c-alm.tfstate"
    use_azuread_auth     = true
  }

  defaults = {
    grph_certificate = null
  }
}

# The identity Terraform is running as (the bootstrap SP) - set as owner of everything it creates
data "azuread_client_config" "current" {}

# Microsoft Graph service principal - same appId in every tenant
data "azuread_service_principal" "msgraph" {
  client_id = "00000003-0000-0000-c000-000000000000"
}

# OIDC metadata - issuer and jwks_uri are READ from the tenant rather than constructed,
# because the CIAM issuer host is built from the tenant ID, not the domain prefix.
data "http" "oidc" {
  url = "https://${local.ciam_login_host}/${local.ciam_tenant_id}/v2.0/.well-known/openid-configuration"

  lifecycle {
    postcondition {
      condition     = self.status_code == 200
      error_message = "OIDC metadata not reachable - is the tenant provisioned and the domain prefix correct?"
    }
  }
}