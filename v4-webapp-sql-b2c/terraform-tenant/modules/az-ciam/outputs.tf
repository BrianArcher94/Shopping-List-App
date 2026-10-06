# Details to output after TF Plan & Apply
output "ciam_id" {
  description = "The ARM resource ID of the External ID tenant"
  value       = azapi_resource.main.id
}

output "ciam_tenant_id" {
  description = "The tenant ID (GUID) of the External ID tenant"
  value       = azapi_resource.main.output.properties.tenantId
}

output "ciam_domain_name" {
  description = "The initial domain name of the External ID tenant"
  value       = azapi_resource.main.output.properties.domainName
}

output "ciam_domain_prefix" {
  description = "The domain prefix, used to build the ciamlogin.com authority host"
  value       = var.ciam_domain_prefix
}