# ---------------------------------------------------------------------------
# azurerm_service_plan.main
# ---------------------------------------------------------------------------

output "lgap_apsp_id" {
  description = "Logic App service plan ID."
  value       = azurerm_service_plan.main-lgaps.id
}

output "lgap_apsp_name" {
  description = "Logic App service plan name."
  value       = azurerm_service_plan.main-lgaps.name
}

output "lgap_apsp_resource_group_name" {
  description = "Logic App service plan resource group."
  value       = azurerm_service_plan.main-lgaps.resource_group_name
}

output "lgap_apsp_kind" {
  description = "The kind of the Logic App service plan."
  value       = azurerm_service_plan.main-lgaps.kind
}

output "lgap_apsp_reserved" {
  description = "Whether the service plan is reserved (true for Linux)."
  value       = azurerm_service_plan.main-lgaps.reserved
}

output "lgap_apsp_maximum_number_of_workers" {
  description = "The maximum number of workers supported by the service plan's SKU."
  value       = azurerm_service_plan.main-lgaps.maximum_elastic_worker_count
}

# ---------------------------------------------------------------------------
# azurerm_logic_app_standard.main
# ---------------------------------------------------------------------------

output "lgap_id" {
  description = "The ID of the Logic App Standard."
  value       = azurerm_logic_app_standard.main.id
}

output "lgap_name" {
  description = "The name of the Logic App Standard."
  value       = azurerm_logic_app_standard.main.name
}

output "lgap_default_hostname" {
  description = "The default hostname of the Logic App Standard."
  value       = azurerm_logic_app_standard.main.default_hostname
}

output "lgap_kind" {
  description = "The kind of the Logic App Standard."
  value       = azurerm_logic_app_standard.main.kind
}

output "lgap_outbound_ip_addresses" {
  description = "Comma-separated list of outbound IP addresses currently used by the Logic App."
  value       = azurerm_logic_app_standard.main.outbound_ip_addresses
}

output "lgap_possible_outbound_ip_addresses" {
  description = "Comma-separated list of all possible outbound IP addresses for the Logic App."
  value       = azurerm_logic_app_standard.main.possible_outbound_ip_addresses
}

output "lgap_custom_domain_verification_id" {
  description = "Identifier used for custom-domain verification (used in the asuid DNS record)."
  value       = azurerm_logic_app_standard.main.custom_domain_verification_id
  sensitive   = true
}

output "lgap_identity_principal_id" {
  description = "The Principal ID of the system-assigned Managed Identity."
  value       = try(azurerm_logic_app_standard.main.identity[0].principal_id, null)
}

output "lgap_identity_tenant_id" {
  description = "The Tenant ID of the system-assigned Managed Identity."
  value       = try(azurerm_logic_app_standard.main.identity[0].tenant_id, null)
}

output "lgap_site_credential_username" {
  description = "The username of the publishing (SCM) credential for the Logic App."
  value       = try(azurerm_logic_app_standard.main.site_credential[0].username, null)
}

output "lgap_site_credential_password" {
  description = "The password of the publishing (SCM) credential for the Logic App."
  value       = try(azurerm_logic_app_standard.main.site_credential[0].password, null)
  sensitive   = true
}

# ---------------------------------------------------------------------------
# azurerm_private_endpoint.main
# ---------------------------------------------------------------------------

output "pnpt_id" {
  description = "The ID of the Logic App private endpoint."
  value       = azurerm_private_endpoint.main.id
}

output "pnpt_name" {
  description = "The name of the Logic App private endpoint."
  value       = azurerm_private_endpoint.main.name
}

output "pnpt_private_ip_address" {
  description = "The private IP address allocated to the Logic App private endpoint."
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
  description = "The ID of the Logic App diagnostic setting."
  value       = azurerm_monitor_diagnostic_setting.main.id
}
