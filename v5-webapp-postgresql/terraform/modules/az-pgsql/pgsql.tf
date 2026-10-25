resource "azurerm_postgresql_flexible_server" "main" {
  name                          = var.postgres_server_name
  resource_group_name           = var.shared.resg.name
  location                      = var.shared.resg.location
  public_network_access_enabled = var.public_network_access_enabled
  sku_name                      = var.postgres_config.sku_name
  version                       = var.postgres_config.version
  storage_tier                  = var.postgres_config.storage_tier
  storage_mb                    = var.postgres_config.storage_size_gb * 1024

  authentication {
    active_directory_auth_enabled = var.active_directory_auth_enabled
    tenant_id                     = var.tenant_id
    password_auth_enabled         = false
  }

  identity {
    type         = var.identity_ids != null ? "SystemAssigned, UserAssigned" : "SystemAssigned"
    identity_ids = var.identity_ids
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  for_each  = toset(var.pgsql_dbs)
  name      = each.key
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}

# Server parameters (allow-listed extensions, connection/slow-query logging).
resource "azurerm_postgresql_flexible_server_configuration" "main" {
  for_each  = var.pgsql_configurations
  name      = each.key
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = each.value
}

resource "azurerm_private_endpoint" "main" {
  name                = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-pgsql"
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  subnet_id           = var.pe_subnet_id

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.pgsql_dns_zone]
  }

  private_service_connection {
    name                           = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-${split("-", var.postgres_server_name)[4]}-pgsql-psc"
    private_connection_resource_id = azurerm_postgresql_flexible_server.main.id
    is_manual_connection           = false
    subresource_names              = ["postgresqlServer"]
  }
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "main" {
  count            = var.public_network_access_enabled ? 1 : 0
  name             = "My-IP-Allowed"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = var.shared.ip_address
  end_ip_address   = var.shared.ip_address
}

resource "azurerm_postgresql_flexible_server_active_directory_administrator" "main" {
  for_each            = var.pgsql_admins
  server_name         = azurerm_postgresql_flexible_server.main.name
  resource_group_name = var.shared.resg.name
  tenant_id           = var.tenant_id
  object_id           = each.value.object_id
  principal_name      = each.key
  principal_type      = each.value.principal_type
}

resource "azurerm_monitor_diagnostic_setting" "main" {
  name                       = azurerm_postgresql_flexible_server.main.name
  target_resource_id         = azurerm_postgresql_flexible_server.main.id
  log_analytics_workspace_id = var.log_analytics_id

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
