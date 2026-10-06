# Details to output after TF Plan & Apply

output "output_resource_group" {
  description = "Resource group name (also read by the CANCEL stage of the infra pipelines)"
  value       = azurerm_resource_group.main[0].name
}

output "wapp_name" {
  description = "Web App name — must match webAppName in pipelines/wapp-deploy.yml"
  value       = local.wapp.count > 0 ? module.az-wapp[0].wapp_name : null
}

output "fnap_name" {
  description = "Function App name — must match functionAppName in pipelines/fnap-deploy.yml"
  value       = local.fnap.count > 0 ? module.az-fnap[0].fnap_name : null
}

output "lgaps_name" {
  description = "Logic App name — must match logicAppName in pipelines/logic-deploy.yml"
  value       = local.lgaps.count > 0 ? module.az-lgaps[0].lgap_name : null
}

output "hostname" {
  description = "Public hostname served by the Application Gateway"
  value       = local.hostname
}

output "auth_settings" {
  description = "External ID values the Function App validates tokens against (from terraform-identity/ via remote state)"
  value       = local.idn
}


output "grph_certificate" {
  description = "PUBLIC half of the Key Vault certificate for the Function's Graph client assertions - read by terraform-identity/ (main.grant.tf) and uploaded to the graph app registration. Contains no private key."
  value = {
    certificate_data_base64 = azurerm_key_vault_certificate.graph-assertion.certificate_data_base64
    thumbprint              = azurerm_key_vault_certificate.graph-assertion.thumbprint
    not_before              = azurerm_key_vault_certificate.graph-assertion.certificate_attribute[0].not_before
    expires                 = azurerm_key_vault_certificate.graph-assertion.certificate_attribute[0].expires
  }
}
