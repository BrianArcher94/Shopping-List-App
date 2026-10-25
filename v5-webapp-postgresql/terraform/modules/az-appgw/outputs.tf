output "application_gateway_id" {
  description = "The ID of the Azure Application Gateway."
  value       = azurerm_application_gateway.main.id
}

output "application_gateway_name" {
  description = "The name of the Azure Application Gateway."
  value       = azurerm_application_gateway.main.name
}

output "public_ip_id" {
  description = "The ID of the Azure Public IP address associated with the Application Gateway."
  value       = azurerm_public_ip.main.id
}
