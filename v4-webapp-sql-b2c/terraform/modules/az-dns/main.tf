resource "azurerm_private_dns_zone" "main" {
  for_each = toset(var.dns_zones)

  name                = each.value
  resource_group_name = var.shared.resg.name

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "link-to-spoke" {
  for_each = toset(var.dns_zones)

  name                  = "${each.value}-spoke-vnet-link"
  resource_group_name   = var.shared.resg.name
  private_dns_zone_name = azurerm_private_dns_zone.main[each.value].name
  virtual_network_id    = var.spoke_vnet_id
  registration_enabled  = false
}