####################################################################################################
# Cosmos DB account
####################################################################################################

output "cosmos_id" {
  description = "Resource ID of the Cosmos DB account."
  value       = azurerm_cosmosdb_account.main.id
}

output "cosmos_name" {
  description = "Name of the Cosmos DB account."
  value       = azurerm_cosmosdb_account.main.name
}

output "cosmos_endpoint" {
  description = "Account endpoint (public name; resolves to the private endpoint inside the spoke). Use for COSMOS_ENDPOINT."
  value       = azurerm_cosmosdb_account.main.endpoint
}

output "cosmos_resource_group_name" {
  description = "Resource group containing the account."
  value       = azurerm_cosmosdb_account.main.resource_group_name
}

output "cosmos_location" {
  description = "Azure region of the account resource."
  value       = azurerm_cosmosdb_account.main.location
}

output "cosmos_read_endpoints" {
  description = "Regional read endpoints (each needs a private A record)."
  value       = azurerm_cosmosdb_account.main.read_endpoints
}

output "cosmos_write_endpoints" {
  description = "Regional write endpoints."
  value       = azurerm_cosmosdb_account.main.write_endpoints
}

output "cosmos_capabilities" {
  description = "Capabilities enabled on the account (e.g. EnableServerless)."
  value       = [for c in azurerm_cosmosdb_account.main.capabilities : c.name]
}

output "cosmos_consistency_level" {
  description = "Default consistency level."
  value       = azurerm_cosmosdb_account.main.consistency_policy[0].consistency_level
}

output "cosmos_public_network_access_enabled" {
  description = "Whether the public endpoint is enabled (time-boxed dev access)."
  value       = azurerm_cosmosdb_account.main.public_network_access_enabled
}

output "cosmos_local_authentication_disabled" {
  description = "Whether key-based auth is disabled (keyless)."
  value       = azurerm_cosmosdb_account.main.local_authentication_disabled
}

output "cosmos_backup" {
  description = "Backup policy ({ type, tier }; null if Azure default)."
  value = try({
    type = azurerm_cosmosdb_account.main.backup[0].type
    tier = azurerm_cosmosdb_account.main.backup[0].tier
  }, null)
}

# try() keeps these valid when no identity block is configured (they then output null).
output "cosmos_identity_principal_id" {
  description = "Principal ID of the account's system-assigned identity (null if none)."
  value       = try(azurerm_cosmosdb_account.main.identity[0].principal_id, null)
}

####################################################################################################
# Database & containers
####################################################################################################

output "database_id" {
  description = "Resource ID of the SQL database."
  value       = azurerm_cosmosdb_sql_database.main.id
}

output "database_name" {
  description = "Name of the SQL database. Use for COSMOS_DATABASE."
  value       = azurerm_cosmosdb_sql_database.main.name
}

output "container_ids" {
  description = "Map of container name => resource ID."
  value       = { for k, c in azurerm_cosmosdb_sql_container.main : k => c.id }
}

output "containers" {
  description = "Map of container name => { id, partition_key_paths, partition_key_kind, partition_key_version }."
  value = {
    for k, c in azurerm_cosmosdb_sql_container.main : k => {
      id                    = c.id
      partition_key_paths   = c.partition_key_paths
      partition_key_kind    = c.partition_key_kind
      partition_key_version = c.partition_key_version
    }
  }
}

####################################################################################################
# Data-plane role assignments
####################################################################################################

output "role_assignment_ids" {
  description = "Map of label => Cosmos SQL role assignment ID."
  value       = { for k, r in azurerm_cosmosdb_sql_role_assignment.main : k => r.id }
}

output "data_role_scope" {
  description = "Scope the data-plane role is assigned at (<account id>/dbs/<database>)."
  value       = local.data_role_scope
}

####################################################################################################
# Private endpoint
####################################################################################################

output "cosmos_pe_id" {
  description = "Resource ID of the account's private endpoint."
  value       = azurerm_private_endpoint.main.id
}

output "cosmos_pe_name" {
  description = "Name of the account's private endpoint."
  value       = azurerm_private_endpoint.main.name
}

output "cosmos_pe_private_ip_address" {
  description = "Primary private IP of the endpoint in snet-pe."
  value       = azurerm_private_endpoint.main.private_service_connection[0].private_ip_address
}

output "cosmos_pe_private_dns_zone_configs" {
  description = "DNS zone configs and record sets registered for the endpoint (expect the global and the -<region> records)."
  value       = azurerm_private_endpoint.main.private_dns_zone_configs
}

output "cosmos_pe_custom_dns_configs" {
  description = "Custom DNS configs (FQDN => IPs) reported for the endpoint."
  value       = azurerm_private_endpoint.main.custom_dns_configs
}

####################################################################################################
# Diagnostics
####################################################################################################

output "cosmos_diagnostic_setting_id" {
  description = "ID of the account's diagnostic setting."
  value       = azurerm_monitor_diagnostic_setting.main.id
}
