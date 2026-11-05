# Root outputs, read by the pipelines (terraform output -raw <name>) and handy after an
# apply. Resources behind a count use one(...[*]) so they are null, not an error, in
# workspaces or passes where they don't exist (e.g. web_* while deploy_container_apps
# is false).

output "output_resource_group" {
  description = "Resource group name (used by the infra pipelines)."
  value       = azurerm_resource_group.main[0].name
}

output "acr_login_server" {
  description = "ACR login server, e.g. slasqlcondvacrukw001.azurecr.io."
  value       = one(module.az-cr[*].cr_login_server)
}

output "cae_default_domain" {
  description = "Container Apps environment default domain (name of its private DNS zone)."
  value       = one(module.az-ce[*].default_domain)
}

output "cae_static_ip" {
  description = "Container Apps environment internal load balancer IP."
  value       = one(module.az-ce[*].static_ip_address)
}

output "web_app_name" {
  description = "Web container app name (az containerapp update target). Null in pass 1."
  value       = one(module.az-ca[*].name)
}

output "web_fqdn" {
  description = "Web container app FQDN (App Gateway backend). Null in pass 1."
  value       = one(module.az-ca[*].fqdn)
}

output "fnap_hostname" {
  description = "Function App default hostname (API_PROXY_TARGET, resolves to its private endpoint in the spoke)."
  value       = one(module.az-fnap[*].fnap_default_hostname)
}

output "sql_fqdn" {
  description = "Azure SQL server FQDN (SQL_SERVER_FQDN, migrations target)."
  value       = one(module.az-sql[*].sql_fqdn)
}
