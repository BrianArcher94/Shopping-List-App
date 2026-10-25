# ---------------------------------------------------------------------------
# azurerm_service_plan.main
# ---------------------------------------------------------------------------

output "apsp_id" {
  description = "App service plan ID."
  value       = azurerm_service_plan.main.id
}

output "apsp_name" {
  description = "App service plan name."
  value       = azurerm_service_plan.main.name
}

output "apsp_resource_group_name" {
  description = "App service plan resource group."
  value       = azurerm_service_plan.main.resource_group_name
}

output "apsp_kind" {
  description = "The kind of the App Service Plan (e.g. Windows, Linux, elastic)."
  value       = azurerm_service_plan.main.kind
}

output "apsp_reserved" {
  description = "Whether the App Service Plan is reserved (true for Linux)."
  value       = azurerm_service_plan.main.reserved
}

output "apsp_maximum_number_of_workers" {
  description = "The maximum number of workers supported by the App Service Plan's SKU."
  value       = azurerm_service_plan.main.maximum_elastic_worker_count
}

# ---------------------------------------------------------------------------
# azurerm_linux_web_app.main
# ---------------------------------------------------------------------------

output "wapp_id" {
  description = "The ID of the Linux Web App."
  value       = azurerm_linux_web_app.main.id
}

output "wapp_name" {
  description = "The name of the Linux Web App."
  value       = azurerm_linux_web_app.main.name
}

output "wapp_default_hostname" {
  description = "The default hostname of the Linux Web App."
  value       = azurerm_linux_web_app.main.default_hostname
}

output "wapp_kind" {
  description = "The kind of the Linux Web App."
  value       = azurerm_linux_web_app.main.kind
}

output "wapp_hosting_environment_id" {
  description = "The ID of the App Service Environment hosting the app, if any."
  value       = azurerm_linux_web_app.main.hosting_environment_id
}

output "wapp_outbound_ip_addresses" {
  description = "Comma-separated list of outbound IP addresses currently used by the Web App."
  value       = azurerm_linux_web_app.main.outbound_ip_addresses
}

output "wapp_outbound_ip_address_list" {
  description = "List of outbound IP addresses currently used by the Web App."
  value       = azurerm_linux_web_app.main.outbound_ip_address_list
}

output "wapp_possible_outbound_ip_addresses" {
  description = "Comma-separated list of all possible outbound IP addresses for the Web App."
  value       = azurerm_linux_web_app.main.possible_outbound_ip_addresses
}

output "wapp_possible_outbound_ip_address_list" {
  description = "List of all possible outbound IP addresses for the Web App."
  value       = azurerm_linux_web_app.main.possible_outbound_ip_address_list
}

output "wapp_custom_domain_verification_id" {
  description = "Identifier used for custom-domain verification (used in the asuid DNS record)."
  value       = azurerm_linux_web_app.main.custom_domain_verification_id
  sensitive   = true
}

output "wapp_identity_principal_id" {
  description = "The Principal ID of the system-assigned Managed Identity, if an identity block is configured."
  value       = try(azurerm_linux_web_app.main.identity[0].principal_id, null)
}

output "wapp_identity_tenant_id" {
  description = "The Tenant ID of the system-assigned Managed Identity, if an identity block is configured."
  value       = try(azurerm_linux_web_app.main.identity[0].tenant_id, null)
}

output "wapp_site_credential_name" {
  description = "The username of the publishing (SCM) credential for the Web App."
  value       = try(azurerm_linux_web_app.main.site_credential[0].name, null)
}

output "wapp_site_credential_password" {
  description = "The password of the publishing (SCM) credential for the Web App."
  value       = try(azurerm_linux_web_app.main.site_credential[0].password, null)
  sensitive   = true
}

# ---------------------------------------------------------------------------
# azurerm_private_endpoint.main
# ---------------------------------------------------------------------------

output "pnpt_id" {
  description = "The ID of the Web App private endpoint."
  value       = azurerm_private_endpoint.main.id
}

output "pnpt_name" {
  description = "The name of the Web App private endpoint."
  value       = azurerm_private_endpoint.main.name
}

output "pnpt_private_ip_address" {
  description = "The private IP address allocated to the Web App private endpoint."
  value       = azurerm_private_endpoint.main.private_service_connection[0].private_ip_address
}

output "pnpt_network_interface" {
  description = "The network interface(s) (id and name) associated with the private endpoint."
  value       = azurerm_private_endpoint.main.network_interface
}

output "pnpt_custom_dns_configs" {
  description = "The custom DNS configurations (fqdn and ip_addresses) of the private endpoint."
  value       = azurerm_private_endpoint.main.custom_dns_configs
}

output "pnpt_private_dns_zone_configs" {
  description = "The computed private DNS zone configurations (id, name, record_sets) applied by the private endpoint's DNS zone group."
  value       = azurerm_private_endpoint.main.private_dns_zone_configs
}

# ---------------------------------------------------------------------------
# azurerm_monitor_diagnostic_setting.main
# ---------------------------------------------------------------------------

output "diagnostic_setting_id" {
  description = "The ID of the Web App diagnostic setting."
  value       = azurerm_monitor_diagnostic_setting.main.id
}
