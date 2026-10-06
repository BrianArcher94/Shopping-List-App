resource "azurerm_key_vault_secret" "main-ssl" {
  name         = "CloudFlare-Client-Origin-Cert"
  key_vault_id = module.az-core.kyvt_id
  content_type = "application/x-pkcs12"
  value        = filebase64("<PathToCertificateFile>")



  depends_on = [
    module.az-core,
    time_sleep.kyvt_rbac_propagation
  ]

}
