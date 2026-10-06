output "ciam_tenant_id" {
  description = "Tenant ID of the External ID tenant for this workspace"
  value       = local.ciam.count > 0 ? module.az-ciam[0].ciam_tenant_id : null
}

output "ciam_domain_prefix" {
  description = "Domain prefix of the External ID tenant for this workspace"
  value       = local.ciam.count > 0 ? module.az-ciam[0].ciam_domain_prefix : null
}