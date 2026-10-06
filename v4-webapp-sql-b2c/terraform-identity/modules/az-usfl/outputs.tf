# Details to output after TF Plan & Apply
output "usfl_id" {
  description = "The ID of the user flow"
  value       = msgraph_resource.main.output.id
}

output "usfl_name" {
  description = "The display name of the user flow"
  value       = var.usfl_name
}