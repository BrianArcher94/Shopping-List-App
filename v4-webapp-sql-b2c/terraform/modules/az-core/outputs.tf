# Details to output after TF Plan & Apply
################################################################################################################################
# Log Analytics
################################################################################################################################

output "loga_name" {
  description = "The name of the Log Analytics Workspace"
  value       = var.create_loga == true ? azurerm_log_analytics_workspace.main[0].name : null
}

output "loga_resource_group_name" {
  description = "The name of the the resource group that the Log Analytics Workspace belongs to"
  value       = var.create_loga == true ? azurerm_log_analytics_workspace.main[0].resource_group_name : null
}

output "loga_id" {
  description = "The ID of the Log Analytics Workspace"
  value       = var.create_loga == true ? azurerm_log_analytics_workspace.main[0].id : null
}

output "loga_primary_shared_key" {
  description = "The primary shared key of the Log Analytics Workspace"
  value       = var.create_loga == true ? azurerm_log_analytics_workspace.main[0].primary_shared_key :  null
}

output "loga_secondary_shared_key" {
  description = "The secondary shared key of the Log Analytics Workspace"
  value       = var.create_loga == true ? azurerm_log_analytics_workspace.main[0].secondary_shared_key  : null
}

output "loga_workspace_id" {
  description = "The workspace ID of the Log Analytics Workspace"
  value       = var.create_loga == true ? azurerm_log_analytics_workspace.main[0].workspace_id :  null
}

################################################################################################################################
# Application Insights
################################################################################################################################

output "apin_name" {
  description = "The name of the Application Insights"
  value       = var.create_apin == true ? azurerm_application_insights.main[0].name : null
}

output "apin_resource_group_name" {
  description = "The name of the resource group that the Application Insights belongs to"
  value       = var.create_apin == true ? azurerm_application_insights.main[0].resource_group_name : null
}

output "apin_id" {
  description = "The ID of the Application Insights"
  value       = var.create_apin == true ? azurerm_application_insights.main[0].id :  null
}

output "apin_app_id" {
  description = "The app ID of the Application Insights"
  value       = var.create_apin == true ? azurerm_application_insights.main[0].app_id : null
}

output "apin_instrumentation_key" {
  description = "The instrumentation key of the Application Insights"
  value       = var.create_apin == true ? azurerm_application_insights.main[0].instrumentation_key : null
}

output "apin_connection_string" {
  description = "The connection string of the Application Insights"
  value       = var.create_apin == true ? azurerm_application_insights.main[0].connection_string :  null
}


################################################################################################################################
# Key Vault
################################################################################################################################

output "kyvt_name" {
  description = "The name of the Key Vault"
  value       = var.create_kyvt == true ? azurerm_key_vault.main[0].name :  null
}

output "kyvt_resource_group_name" {
  description = "The name of the resource group that the Key Vault belongs to"
  value       = var.create_kyvt == true ? azurerm_key_vault.main[0].resource_group_name :  null
}

output "kyvt_id" {
  description = "The ID of the Key Vault"
  value       = var.create_kyvt == true ? azurerm_key_vault.main[0].id : null
}

output "kyvt_vault_uri" {
  description = "The URI of the Key Vault"
  value       = var.create_kyvt == true ? azurerm_key_vault.main[0].vault_uri : null
}

################################################################################################################################
# Managed Identity
################################################################################################################################

output "msid_name" {
  description = "The name of the Managed Identity"
  value       = var.create_msid == true ? azurerm_user_assigned_identity.main[0].name : null
}

output "msid_id" {
  description = "The ID of the Managed Identity"
  value       = var.create_msid == true ? azurerm_user_assigned_identity.main[0].id : null
}

output "msid_principal_id" {
  description = "The principal ID of the Managed Identity"
  value       = var.create_msid == true ? azurerm_user_assigned_identity.main[0].principal_id : null
}

output "msid_client_id" {
  description = "The client ID of the Managed Identity"
  value       = var.create_msid == true ? azurerm_user_assigned_identity.main[0].client_id : null
}

output "msid_tenant_id" {
  description = "The tenant ID of the Managed Identity"
  value       = var.create_msid == true ? azurerm_user_assigned_identity.main[0].tenant_id : null
}


