# ---------------------------------------------------------------------------
# azurerm_service_plan.main-fnapp
# ---------------------------------------------------------------------------

output "fnap_apsp_id" {
  description = "Function App service plan ID."
  value       = azurerm_service_plan.main-fnapp.id
}

output "fnap_apsp_name" {
  description = "Function App service plan name."
  value       = azurerm_service_plan.main-fnapp.name
}

output "fnap_apsp_resource_group_name" {
  description = "Function App service plan resource group."
  value       = azurerm_service_plan.main-fnapp.resource_group_name
}

output "fnap_apsp_kind" {
  description = "The kind of the Function App service plan."
  value       = azurerm_service_plan.main-fnapp.kind
}

output "fnap_apsp_reserved" {
  description = "Whether the service plan is reserved (true for Linux)."
  value       = azurerm_service_plan.main-fnapp.reserved
}

output "fnap_apsp_maximum_number_of_workers" {
  description = "The maximum number of workers supported by the service plan's SKU."
  value       = azurerm_service_plan.main-fnapp.maximum_elastic_worker_count
}

# ---------------------------------------------------------------------------
# azurerm_function_app_flex_consumption.main
# ---------------------------------------------------------------------------

output "fnap_id" {
  description = "The ID of the Function App."
  value       = azurerm_function_app_flex_consumption.main.id
}

output "fnap_name" {
  description = "The name of the Function App."
  value       = azurerm_function_app_flex_consumption.main.name
}

output "fnap_default_hostname" {
  description = "The default hostname of the Function App."
  value       = azurerm_function_app_flex_consumption.main.default_hostname
}

output "fnap_kind" {
  description = "The kind of the Function App."
  value       = azurerm_function_app_flex_consumption.main.kind
}

output "fnap_hosting_environment_id" {
  description = "The ID of the App Service Environment hosting the Function App, if any."
  value       = azurerm_function_app_flex_consumption.main.hosting_environment_id
}

output "fnap_outbound_ip_addresses" {
  description = "Comma-separated list of outbound IP addresses currently used by the Function App."
  value       = azurerm_function_app_flex_consumption.main.outbound_ip_addresses
}

output "fnap_outbound_ip_address_list" {
  description = "List of outbound IP addresses currently used by the Function App."
  value       = azurerm_function_app_flex_consumption.main.outbound_ip_address_list
}

output "fnap_possible_outbound_ip_addresses" {
  description = "Comma-separated list of all possible outbound IP addresses for the Function App."
  value       = azurerm_function_app_flex_consumption.main.possible_outbound_ip_addresses
}

output "fnap_possible_outbound_ip_address_list" {
  description = "List of all possible outbound IP addresses for the Function App."
  value       = azurerm_function_app_flex_consumption.main.possible_outbound_ip_address_list
}

output "fnap_custom_domain_verification_id" {
  description = "Identifier used for custom-domain verification (used in the asuid DNS record)."
  value       = azurerm_function_app_flex_consumption.main.custom_domain_verification_id
  sensitive   = true
}

output "fnap_identity_principal_id" {
  description = "The Principal ID of the system-assigned Managed Identity, if an identity block is configured."
  value       = try(azurerm_function_app_flex_consumption.main.identity[0].principal_id, null)
}

output "fnap_identity_tenant_id" {
  description = "The Tenant ID of the system-assigned Managed Identity, if an identity block is configured."
  value       = try(azurerm_function_app_flex_consumption.main.identity[0].tenant_id, null)
}

output "fnap_site_credential_name" {
  description = "The username of the publishing (SCM) credential for the Function App."
  value       = try(azurerm_function_app_flex_consumption.main.site_credential[0].name, null)
}

output "fnap_site_credential_password" {
  description = "The password of the publishing (SCM) credential for the Function App."
  value       = try(azurerm_function_app_flex_consumption.main.site_credential[0].password, null)
  sensitive   = true
}

# ---------------------------------------------------------------------------
# azurerm_private_endpoint.main
# ---------------------------------------------------------------------------

output "pnpt_id" {
  description = "The ID of the Function App private endpoint."
  value       = azurerm_private_endpoint.main.id
}

output "pnpt_name" {
  description = "The name of the Function App private endpoint."
  value       = azurerm_private_endpoint.main.name
}

output "pnpt_private_ip_address" {
  description = "The private IP address allocated to the Function App private endpoint."
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
  description = "The ID of the Function App diagnostic setting."
  value       = azurerm_monitor_diagnostic_setting.main.id
}
