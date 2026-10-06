# Details to output after TF Plan & Apply
output "appr_name" {
  description = "The display name of the app registration"
  value       = azuread_application.main.display_name
}

output "appr_id" {
  description = "The resource ID of the app registration (/applications/<object id>)"
  value       = azuread_application.main.id
}

output "appr_object_id" {
  description = "The object ID of the app registration"
  value       = azuread_application.main.object_id
}

output "appr_client_id" {
  description = "The client (application) ID of the app registration"
  value       = azuread_application.main.client_id
}

output "appr_sp_object_id" {
  description = "The object ID of the service principal"
  value       = azuread_service_principal.main.object_id
}

output "appr_identifier_uri" {
  description = "The Application ID URI, null if the app does not expose an API"
  value       = length(var.oauth2_scopes) > 0 ? azuread_application_identifier_uri.main[0].identifier_uri : null
}

output "appr_scope_ids" {
  description = "Exposed scope IDs keyed by scope value"
  value       = { for value, uuid in random_uuid.scope : value => uuid.result }
}