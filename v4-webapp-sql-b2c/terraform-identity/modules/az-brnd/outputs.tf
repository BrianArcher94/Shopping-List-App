# Details to output after TF Plan & Apply
output "brnd_background_color" {
  description = "Background colour applied to the hosted sign-in pages"
  value       = var.background_color
}

output "brnd_images" {
  description = "Branding images uploaded (Graph stream property names)"
  value       = keys(var.images)
}
