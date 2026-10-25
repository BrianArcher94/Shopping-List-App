####################################################################################################
# PostgreSQL Flexible Server
####################################################################################################

output "pgsql_id" {
  description = "Resource ID of the PostgreSQL Flexible Server."
  value       = azurerm_postgresql_flexible_server.main.id
}

output "pgsql_name" {
  description = "Name of the PostgreSQL Flexible Server."
  value       = azurerm_postgresql_flexible_server.main.name
}

output "pgsql_fqdn" {
  description = "Server FQDN (public name; resolves to the private endpoint inside the spoke). Use for PGHOST."
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "pgsql_resource_group_name" {
  description = "Resource group containing the server."
  value       = azurerm_postgresql_flexible_server.main.resource_group_name
}

output "pgsql_location" {
  description = "Azure region of the server."
  value       = azurerm_postgresql_flexible_server.main.location
}

output "pgsql_version" {
  description = "PostgreSQL major version."
  value       = azurerm_postgresql_flexible_server.main.version
}

output "pgsql_sku_name" {
  description = "Compute SKU (e.g. B_Standard_B1ms)."
  value       = azurerm_postgresql_flexible_server.main.sku_name
}

output "pgsql_storage_mb" {
  description = "Provisioned storage in MB."
  value       = azurerm_postgresql_flexible_server.main.storage_mb
}

output "pgsql_storage_tier" {
  description = "Storage performance tier (e.g. P4)."
  value       = azurerm_postgresql_flexible_server.main.storage_tier
}

output "pgsql_auto_grow_enabled" {
  description = "Whether storage auto-grow is enabled."
  value       = azurerm_postgresql_flexible_server.main.auto_grow_enabled
}

output "pgsql_backup_retention_days" {
  description = "Backup retention in days."
  value       = azurerm_postgresql_flexible_server.main.backup_retention_days
}

output "pgsql_geo_redundant_backup_enabled" {
  description = "Whether geo-redundant backups are enabled."
  value       = azurerm_postgresql_flexible_server.main.geo_redundant_backup_enabled
}

output "pgsql_zone" {
  description = "Availability zone Azure placed the server in."
  value       = azurerm_postgresql_flexible_server.main.zone
}

output "pgsql_public_network_access_enabled" {
  description = "Whether the public endpoint is enabled (bootstrap window)."
  value       = azurerm_postgresql_flexible_server.main.public_network_access_enabled
}

output "pgsql_delegated_subnet_id" {
  description = "Delegated subnet ID (VNet-injection networking only; null in Private Endpoint mode)."
  value       = azurerm_postgresql_flexible_server.main.delegated_subnet_id
}

output "pgsql_private_dns_zone_id" {
  description = "Private DNS zone ID set on the server (VNet-injection networking only)."
  value       = azurerm_postgresql_flexible_server.main.private_dns_zone_id
}

output "pgsql_administrator_login" {
  description = "Password-auth administrator login (null when password auth is disabled)."
  value       = azurerm_postgresql_flexible_server.main.administrator_login
}

output "pgsql_authentication" {
  description = "Authentication settings: Entra (AD) auth, password auth and tenant ID."
  value = {
    active_directory_auth_enabled = try(azurerm_postgresql_flexible_server.main.authentication[0].active_directory_auth_enabled, null)
    password_auth_enabled         = try(azurerm_postgresql_flexible_server.main.authentication[0].password_auth_enabled, null)
    tenant_id                     = try(azurerm_postgresql_flexible_server.main.authentication[0].tenant_id, null)
  }
}

# try() keeps these valid if the identity block is removed (they then output null).
output "pgsql_identity_principal_id" {
  description = "Principal ID of the server's system-assigned identity (null if no identity)."
  value       = try(azurerm_postgresql_flexible_server.main.identity[0].principal_id, null)
}

output "pgsql_identity_tenant_id" {
  description = "Tenant ID of the server's system-assigned identity (null if no identity)."
  value       = try(azurerm_postgresql_flexible_server.main.identity[0].tenant_id, null)
}

output "pgsql_identity_ids" {
  description = "User-assigned identity IDs attached to the server (null if none)."
  value       = try(azurerm_postgresql_flexible_server.main.identity[0].identity_ids, null)
}

####################################################################################################
# Databases (for_each over var.pgsql_dbs)
####################################################################################################

output "pgsql_database_ids" {
  description = "Map of database key => resource ID."
  value       = { for k, db in azurerm_postgresql_flexible_server_database.main : k => db.id }
}

output "pgsql_database_names" {
  description = "List of database names."
  value       = values(azurerm_postgresql_flexible_server_database.main)[*].name
}

output "pgsql_databases" {
  description = "Map of database key => { id, name, charset, collation }."
  value = {
    for k, db in azurerm_postgresql_flexible_server_database.main : k => {
      id        = db.id
      name      = db.name
      charset   = db.charset
      collation = db.collation
    }
  }
}

####################################################################################################
# Private endpoint
####################################################################################################

output "pgsql_pe_id" {
  description = "Resource ID of the server's private endpoint."
  value       = azurerm_private_endpoint.main.id
}

output "pgsql_pe_name" {
  description = "Name of the server's private endpoint."
  value       = azurerm_private_endpoint.main.name
}

output "pgsql_pe_private_ip_address" {
  description = "Private IP of the endpoint in snet-pe (what the server's FQDN resolves to inside the spoke)."
  value       = azurerm_private_endpoint.main.private_service_connection[0].private_ip_address
}

output "pgsql_pe_network_interface" {
  description = "Network interface created for the private endpoint ({ id, name })."
  value       = try(azurerm_private_endpoint.main.network_interface[0], null)
}

output "pgsql_pe_private_dns_zone_group_id" {
  description = "ID of the private DNS zone group attached to the endpoint."
  value       = try(azurerm_private_endpoint.main.private_dns_zone_group[0].id, null)
}

output "pgsql_pe_private_dns_zone_configs" {
  description = "DNS zone configs and record sets registered for the endpoint."
  value       = azurerm_private_endpoint.main.private_dns_zone_configs
}

output "pgsql_pe_custom_dns_configs" {
  description = "Custom DNS configs (FQDN => IP) reported for the endpoint."
  value       = azurerm_private_endpoint.main.custom_dns_configs
}

####################################################################################################
# Firewall rule (bootstrap access)
# one(...[*]) works whether the rule is a single resource or later gets count = 0/1.
####################################################################################################

output "pgsql_firewall_rule_id" {
  description = "ID of the bootstrap firewall rule (null if it doesn't exist)."
  value       = one(azurerm_postgresql_flexible_server_firewall_rule.main[*].id)
}

output "pgsql_firewall_rule_name" {
  description = "Name of the bootstrap firewall rule (null if it doesn't exist)."
  value       = one(azurerm_postgresql_flexible_server_firewall_rule.main[*].name)
}

output "pgsql_firewall_rule_ip_range" {
  description = "Allowed IP range of the bootstrap firewall rule ({ start, end }; null if it doesn't exist)."
  value = one([
    for r in azurerm_postgresql_flexible_server_firewall_rule.main[*] : {
      start = r.start_ip_address
      end   = r.end_ip_address
    }
  ])
}

####################################################################################################
# Server configurations and diagnostics
####################################################################################################

output "pgsql_configurations" {
  description = "Server parameters set by this module (name => value)."
  value       = { for k, c in azurerm_postgresql_flexible_server_configuration.main : k => c.value }
}

output "pgsql_diagnostic_setting_id" {
  description = "ID of the server's diagnostic setting."
  value       = azurerm_monitor_diagnostic_setting.main.id
}
