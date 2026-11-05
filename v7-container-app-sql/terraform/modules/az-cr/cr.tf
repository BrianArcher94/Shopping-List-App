resource "azurerm_container_registry" "main" {
  name                = var.cr_name
  resource_group_name = var.shared.resg.name
  location            = var.shared.resg.location
  sku                 = var.cr_sku

  identity {
    type         = var.identity_ids != null ? "SystemAssigned, UserAssigned" : "SystemAssigned"
    identity_ids = var.identity_ids
  }

  dynamic "georeplications" {

    for_each = var.georeplication_locations
    content {
      location                  = georeplications.value.location
      regional_endpoint_enabled = georeplications.value.regional_endpoint_enabled
      zone_redundancy_enabled   = georeplications.value.zone_redundancy_enabled
    }

  }

  # Identity only (AcrPull for the UAMI) - no shared admin credentials.
  admin_enabled = var.admin_enabled

  # Public access stays on for az acr build: ACR Tasks runs outside the VNet and comes in
  # through the public endpoint. The firewall denies by default, AzureServices lets the
  # trusted Tasks service through, and allowed_ips admits the build agent (plan §10.3).
  public_network_access_enabled = var.public_network_access_enabled
  network_rule_bypass_option    = var.network_rule_bypass_option

  # Network rules are Premium-only, so they are omitted on lower SKUs.
  network_rule_set = var.cr_sku == "Premium" ? [
    {
      default_action = "Deny"
      ip_rule = [
        for ip in var.allowed_ips : {
          action   = "Allow"
          ip_range = ip
        }
      ]
    }
  ] : []

  # Dedicated <name>.<region>.data.azurecr.io endpoint, covered by the private endpoint, so
  # layer downloads don't use the shared regional blob endpoint (Premium).
  data_endpoint_enabled = var.data_endpoint_enabled

  # Untagged manifests are deleted after this many days (Premium). null = keep them.
  retention_policy_in_days = var.untagged_retention_days

  tags = var.tags

}

# The "registry" subresource also creates the data endpoint record in the zone when
# data_endpoint_enabled is true.
resource "azurerm_private_endpoint" "main" {
  # Gated on a plain bool, not on pe_subnet_id: the subnet ID is unknown until the subnet
  # exists, and count must be known at plan time.
  count               = var.private_endpoint_enabled ? 1 : 0
  name                = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-cr-${format("%03d", count.index + 1)}"
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  subnet_id           = var.pe_subnet_id
  tags                = var.tags

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.cr_dns_zone_id]
  }

  private_service_connection {
    name                           = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-cr-${format("%03d", count.index + 1)}-psc"
    private_connection_resource_id = azurerm_container_registry.main.id
    is_manual_connection           = false
    subresource_names              = ["registry"]
  }
}

resource "azurerm_monitor_diagnostic_setting" "main-cr" {
  name                       = azurerm_container_registry.main.name
  target_resource_id         = azurerm_container_registry.main.id
  log_analytics_workspace_id = var.log_analytics_id

  # allLogs already includes the audit group; listing both overlaps.
  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }

}
