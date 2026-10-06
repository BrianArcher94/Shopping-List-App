resource "azurerm_mssql_server" "main" {
  name                              = var.sql_server_name
  resource_group_name               = var.shared.resg.name
  location                          = var.shared.resg.location
  version                           = var.sql_server_version
  public_network_access_enabled     = var.public_network_access_enabled
  minimum_tls_version               = var.minimum_tls_version
  primary_user_assigned_identity_id = var.primary_user_assigned_identity_id

  azuread_administrator {
    azuread_authentication_only = true
    login_username              = var.login_username
    object_id                   = var.object_id
  }

  identity {
    type         = var.identity_ids != null ? "SystemAssigned, UserAssigned" : "SystemAssigned"
    identity_ids = var.identity_ids
  }

  tags = var.tags

}

resource "azurerm_mssql_firewall_rule" "main" {
  name             = var.sql_server_firewall_rule_name
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = var.start_ip
  end_ip_address   = var.end_ip
}

resource "azurerm_mssql_firewall_rule" "azure_services" {
  name             = "AzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_private_endpoint" "main" {
  name                = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-sql"
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  subnet_id           = var.pe_subnet_id
  tags                = var.shared.tags

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.sql_dns_zone]
  }

  private_service_connection {
    name                           = "${var.shared.naming.namingconstant}-pmpt-${var.shared.naming.loc}-${split("-", var.sql_server_name)[4]}-sites-psc"
    private_connection_resource_id = azurerm_mssql_server.main.id
    is_manual_connection           = false
    subresource_names              = ["sqlServer"]
  }
}

resource "azurerm_mssql_database" "main" {
  for_each = var.sql_dbs

  name                        = each.key
  server_id                   = azurerm_mssql_server.main.id
  collation                   = each.value.collation
  max_size_gb                 = each.value.max_size_gb
  min_capacity                = each.value.min_capacity
  auto_pause_delay_in_minutes = each.value.auto_pause_delay_in_minutes
  sku_name                    = each.value.sku_name
  storage_account_type        = each.value.storage_account_type
  geo_backup_enabled          = each.value.geo_backup_enabled
  zone_redundant              = each.value.zone_redundant

  identity {
    type         = "UserAssigned"
    identity_ids = var.identity_ids
  }

  tags = var.tags

}

resource "azurerm_monitor_diagnostic_setting" "main-sqldb" {
  for_each                   = azurerm_mssql_database.main
  name                       = each.value.name
  target_resource_id         = each.value.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category_group = "allLogs"
  }
  
  enabled_log {
    category_group = "audit"
  }

  enabled_metric {
    category = "Basic"
  }

  enabled_metric {
    category = "InstanceAndAppAdvanced"
  }

  enabled_metric {
    category = "WorkloadManagement"
  }
}

resource "azurerm_mssql_database_extended_auditing_policy" "master-db" {
  database_id            = "${azurerm_mssql_server.main.id}/databases/master"
  log_monitoring_enabled = true
}

resource "azurerm_mssql_database_extended_auditing_policy" "main" {
  for_each               = var.sql_dbs
  database_id            = azurerm_mssql_database.main[each.key].id
  log_monitoring_enabled = true
}

resource "azurerm_mssql_server_extended_auditing_policy" "main" {
  server_id              = azurerm_mssql_server.main.id
  log_monitoring_enabled = true
}
