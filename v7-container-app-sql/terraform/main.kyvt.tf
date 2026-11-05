resource "azurerm_key_vault_secret" "main-ssl" {
  name         = "CloudFlare-Client-Origin-Cert"
  key_vault_id = module.az-core.kyvt_id
  content_type = "application/x-pkcs12"
  value        = filebase64("${path.module}/cert/client-cert/origin.pfx")



  depends_on = [
    module.az-core,
    time_sleep.kyvt_rbac_propagation
  ]

}

# App Insights connection string, read from here by all three apps over the Key Vault
# private endpoint (none of them is a trusted service for the vault's firewall bypass):
#   - web container app: Container Apps secret reference via the UAMI (main.ca.tf)
#   - Function App and Logic App: app setting Key Vault references (local below), resolved
#     with each app's system-assigned identity (main.role.tf)
resource "azurerm_key_vault_secret" "apin-connection-string" {
  name         = "AppInsights-ConnectionString"
  key_vault_id = module.az-core.kyvt_id
  content_type = "text/plain"
  value        = module.az-core.apin_connection_string

  depends_on = [
    module.az-core,
    time_sleep.kyvt_rbac_propagation
  ]

}

locals {
  # App Service Key Vault reference syntax. Versionless, so a rotated value is picked up
  # on the platform's periodic refresh (within 24 h) or on restart.
  apin_kv_reference = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.apin-connection-string.versionless_id})"
}
