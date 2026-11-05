output "stra_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.main.*.name

}

output "stra_id" {
  description = "Storage account ID"
  value       = azurerm_storage_account.main.*.id

}

output "stra_resource_group_name" {
  description = "Storage account resource group"
  value       = azurerm_storage_account.main.*.resource_group_name

}

output "stra_resource_group_location" {
  description = "Storage account resource group location"
  value       = azurerm_storage_account.main.*.location

}

output "stra_primary_location" {
  description = "Storage account primary location"
  value       = azurerm_storage_account.main.*.primary_location

}

output "stra_primary_web_endpoint" {
  description = "Storage account endpoint URL"
  value       = azurerm_storage_account.main.*.primary_web_endpoint

}

output "stra_primary_web_host" {
  description = "Storage account hostname"
  value       = azurerm_storage_account.main.*.primary_web_host

}

output "stra_primary_connection_string" {
  description = "Storage account connection_string"
  value       = azurerm_storage_account.main.*.primary_connection_string
  sensitive   = true

}

output "stra_primary_access_key" {
  description = "Storage account primary access key"
  value       = azurerm_storage_account.main.*.primary_access_key
  sensitive   = true

}

output "stra_secondary_access_key" {
  description = "Storage account secondary access key"
  value       = azurerm_storage_account.main.*.secondary_access_key
  sensitive   = true

}

output "stra_containers" {
  description = "Map for containers"
  value       = { for c in azurerm_storage_container.main : c.name => c.id }

}

output "stra_file_shares" {
  description = "Map for file shares"
  value       = { for f in azurerm_storage_share.main : f.name => f.id }

}

output "stra_tables" {
  description = "Map for tables"
  value       = { for t in azurerm_storage_table.main : t.name => t.id }

}

output "stra_queues" {
  description = "Map for file queues"
  value       = { for q in azurerm_storage_queue.main : q.name => q.id }

}
