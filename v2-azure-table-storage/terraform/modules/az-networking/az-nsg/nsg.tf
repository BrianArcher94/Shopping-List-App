resource "azurerm_network_security_group" "main" {
  name                = var.nsg_name
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name

  dynamic "security_rule" {
    for_each = var.nsg_rule
    content {
      name      = security_rule.value.name
      priority  = security_rule.value.priority
      direction = security_rule.value.direction
      access    = security_rule.value.access
      protocol  = security_rule.value.protocol

      source_port_range  = security_rule.value.source_port_range
      source_port_ranges = security_rule.value.source_port_ranges

      destination_port_range  = security_rule.value.destination_port_range
      destination_port_ranges = security_rule.value.destination_port_ranges

      source_address_prefix   = security_rule.value.source_address_prefix
      source_address_prefixes = security_rule.value.source_address_prefixes

      destination_address_prefix   = security_rule.value.destination_address_prefix
      destination_address_prefixes = security_rule.value.destination_address_prefixes

      source_application_security_group_ids      = security_rule.value.source_application_security_group_ids
      destination_application_security_group_ids = security_rule.value.destination_application_security_group_ids

      description = security_rule.value.description
    }

  }

  tags = var.tags

}

resource "azurerm_subnet_network_security_group_association" "main" {
  subnet_id                 = var.subnet_id
  network_security_group_id = azurerm_network_security_group.main.id

}