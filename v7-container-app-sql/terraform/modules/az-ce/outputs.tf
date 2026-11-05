# ---------------------------------------------------------------------------
# azurerm_container_app_environment.main
# ---------------------------------------------------------------------------

output "ce_id" {
  description = "Container Apps environment ID."
  value       = azurerm_container_app_environment.main.id
}

output "default_domain" {
  description = "Environment default domain. Name of the private DNS zone App Gateway resolves the web FQDN through."
  value       = azurerm_container_app_environment.main.default_domain
}

output "static_ip_address" {
  description = "Private static IP of the internal load balancer. Target of the * and @ A records."
  value       = azurerm_container_app_environment.main.static_ip_address
}
