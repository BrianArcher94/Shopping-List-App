# ---------------------------------------------------------------------------
# azurerm_container_registry.main
# ---------------------------------------------------------------------------

output "cr_id" {
  description = "Container registry ID (scope for the AcrPull assignment)."
  value       = azurerm_container_registry.main.id
}

output "cr_login_server" {
  description = "Registry login server, e.g. <name>.azurecr.io."
  value       = azurerm_container_registry.main.login_server
}

output "cr_name" {
  description = "Registry name (known at plan time, unlike the login server)."
  value       = azurerm_container_registry.main.name
}
