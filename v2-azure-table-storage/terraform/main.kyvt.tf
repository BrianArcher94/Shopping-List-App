resource "azurerm_key_vault_secret" "main-ssl" {
  name         = "CloudFlare-Client-Origin-Cert"
  key_vault_id = module.az-core.kyvt_id
  content_type = "application/x-pkcs12"
  value        = filebase64("<PathToCertificateFile>")



  depends_on = [
    azurerm_key_vault_access_policy.uami-kyvt-admin,
    azurerm_key_vault_access_policy.msid-kyvt-secret-officer,
    azurerm_key_vault_access_policy.uami-kyvt-secret-user,
    azurerm_key_vault_access_policy.apsp-kyvt-access,
    azurerm_key_vault_access_policy.wapp-kyvt-access
  ]

}
