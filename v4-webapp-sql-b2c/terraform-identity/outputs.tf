################################################################################################################################
# Tenant
################################################################################################################################

output "ciam_tenant_id" {
  description = "Tenant ID of the External ID tenant"
  value       = local.ciam_tenant_id
}

output "ciam_authority" {
  description = "MSAL authority for the SPA (VITE_AUTH_AUTHORITY)"
  value       = "https://${local.ciam_login_host}/"
}

output "ciam_issuer" {
  description = "Token issuer, read from the tenant's OIDC metadata (AUTH_ISSUER)"
  value       = jsondecode(data.http.oidc.response_body).issuer
}

output "ciam_jwks_uri" {
  description = "Signing keys endpoint, read from the tenant's OIDC metadata (AUTH_JWKS_URI)"
  value       = jsondecode(data.http.oidc.response_body).jwks_uri
}

################################################################################################################################
# App Registrations
################################################################################################################################

output "appr_api_client_id" {
  description = "Client ID of the API app registration - the expected token audience (AUTH_AUDIENCE)"
  value       = local.appr.count > 0 ? module.az-appr-api[0].appr_client_id : null
}

output "appr_api_scope_name" {
  description = "Short scope name as it appears in the scp claim (AUTH_REQUIRED_SCOPE)"
  value       = local.appr.api_scope
}

output "appr_api_scope" {
  description = "Fully qualified scope the SPA requests (VITE_AUTH_API_SCOPE)"
  value       = local.appr.count > 0 ? "${module.az-appr-api[0].appr_identifier_uri}/${local.appr.api_scope}" : null
}

output "appr_graph_client_id" {
  description = "Client ID of the graph app registration the Function App uses for the profile page (GRAPH_CLIENT_ID)"
  value       = local.appr.count > 0 ? module.az-appr-graph[0].appr_client_id : null
}

output "appr_graph_certificate_uploaded" {
  description = "False until the main root's Key Vault certificate has been uploaded (identity -> main -> identity)"
  value       = length(azuread_application_certificate.graph) > 0
}

output "appr_spa_client_id" {
  description = "Client ID of the SPA app registration (VITE_AUTH_CLIENT_ID)"
  value       = local.appr.count > 0 ? module.az-appr-spa[0].appr_client_id : null
}

################################################################################################################################
# User Flow
################################################################################################################################

output "usfl_id" {
  description = "ID of the sign-up and sign-in user flow"
  value       = local.usfl.count > 0 ? module.az-usfl[0].usfl_id : null
}

################################################################################################################################
# Conditional Access
################################################################################################################################

output "cnac_id" {
  description = "ID of the MFA Conditional Access policy"
  value       = local.cnac.count > 0 ? azuread_conditional_access_policy.main[0].id : null
}

output "cnac_state" {
  description = "Current state of the MFA policy (report-only vs enforced)"
  value       = var.cnac_state
}