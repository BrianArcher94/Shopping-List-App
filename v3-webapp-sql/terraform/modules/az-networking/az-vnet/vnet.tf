# Create vnet
resource "azurerm_virtual_network" "main" {
  name                = var.vnet_name
  address_space       = var.address_space
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  dns_servers         = var.dns_servers

  bgp_community = var.bgp_community

  dynamic "ddos_protection_plan" {
    for_each = var.ddos_protection_plan == null ? [] : [var.ddos_protection_plan]
    content {
      id     = ddos_protection_plan.value.id
      enable = ddos_protection_plan.value.enable
    }

  }

  dynamic "encryption" {
    for_each = var.encryption == null ? [] : [var.encryption]
    content {
      enforcement = encryption.value.enforcement
    }

  }

  private_endpoint_vnet_policies = var.private_endpoint_vnet_policies

  tags = var.tags
}

resource "azurerm_monitor_diagnostic_setting" "main" {
  name                       = azurerm_virtual_network.main.name
  target_resource_id         = azurerm_virtual_network.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }

}