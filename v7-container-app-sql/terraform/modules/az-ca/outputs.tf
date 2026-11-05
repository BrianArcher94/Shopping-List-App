# ---------------------------------------------------------------------------
# azurerm_container_app.main
# ---------------------------------------------------------------------------

output "id" {
  description = "Container app ID."
  value       = azurerm_container_app.main.id
}

output "name" {
  description = "Container app name (target of az containerapp update in the app pipeline)."
  value       = azurerm_container_app.main.name
}

output "fqdn" {
  description = "Ingress FQDN on the environment's default domain. App Gateway backend address."
  value       = azurerm_container_app.main.ingress[0].fqdn
}

output "latest_revision_name" {
  description = "Name of the latest revision."
  value       = azurerm_container_app.main.latest_revision_name
}
