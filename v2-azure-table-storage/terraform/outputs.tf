output "resg_name" {
  value = azurerm_resource_group.main[0].name

}

output "resg_id" {
  value = azurerm_resource_group.main[0].id

}

output "project_prefix" {
  value = local.shared.naming.prefix

}

output "project_namingconstant" {
  value = local.shared.naming.namingconstant

}
