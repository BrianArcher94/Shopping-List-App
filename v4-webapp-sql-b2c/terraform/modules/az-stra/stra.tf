resource "azurerm_storage_account" "main" {
  name                       = var.storage_account_name
  resource_group_name        = var.shared.resg.name
  location                   = var.shared.resg.location
  account_kind               = var.account_kind
  account_tier               = local.account_tier
  account_replication_type   = local.account_replication_type
  https_traffic_only_enabled = var.https_traffic_only_enabled
  is_hns_enabled             = var.is_hns_enabled
  sftp_enabled               = var.sftp_enabled


  tags = var.tags

  identity {
    type         = var.identity_ids != null ? "SystemAssigned, UserAssigned" : "SystemAssigned"
    identity_ids = var.identity_ids
  }

  blob_properties {
    delete_retention_policy {
      days = var.blob_soft_delete_retention_days
    }

    container_delete_retention_policy {
      days = var.container_soft_delete_retention_days
    }
    versioning_enabled       = var.enable_versioning
    last_access_time_enabled = var.last_access_time_enabled
    change_feed_enabled      = var.change_feed_enabled

    dynamic "cors_rule" {
      for_each = (var.blob_cors == null ? {} : var.blob_cors)
      content {
        allowed_headers    = cors_rule.value.allowed_headers
        allowed_methods    = cors_rule.value.allowed_methods
        allowed_origins    = cors_rule.value.allowed_origins
        exposed_headers    = cors_rule.value.exposed_headers
        max_age_in_seconds = cors_rule.value.max_age_in_seconds
      }
    }
  }

  dynamic "static_website" {
    for_each = var.static_website
    content {
      index_document     = "index.html"
      error_404_document = "index.html"
    }

  }
}

# Storage advanced protection
resource "azurerm_advanced_threat_protection" "main" {
  target_resource_id = azurerm_storage_account.main.id
  enabled            = var.enable_advanced_threat_protection
}

# Storage container creation
resource "azurerm_storage_container" "main" {
  count                 = length(var.containers_list)
  name                  = var.containers_list[count.index].name
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = var.containers_list[count.index].access_type

}

# Storage file creation
resource "azurerm_storage_share" "main" {
  count              = length(var.file_shares)
  name               = var.file_shares[count.index].name
  storage_account_id = azurerm_storage_account.main.id
  quota              = var.file_shares[count.index].quota

}

# Storage table creation
resource "azurerm_storage_table" "main" {
  count                = length(var.tables)
  name                 = var.tables[count.index]
  storage_account_name = azurerm_storage_account.main.name

}

# Storage queue creation
resource "azurerm_storage_queue" "main" {
  count              = length(var.queues)
  name               = var.queues[count.index]
  storage_account_id = azurerm_storage_account.main.id

}

# Storage lifecycle management
resource "azurerm_storage_management_policy" "main" {
  count              = length(var.lifecycles) == 0 ? 0 : 1
  storage_account_id = azurerm_storage_account.main.id

  dynamic "rule" {
    for_each = var.lifecycles
    iterator = rule

    content {
      name    = "rules${rule.key}"
      enabled = true
      filters {
        prefix_match = rule.value.prefix_match
        blob_types   = ["blockBlob"]
      }

      actions {
        base_blob {
          tier_to_cool_after_days_since_modification_greater_than    = rule.value.tier_to_cool_after_days
          tier_to_archive_after_days_since_modification_greater_than = rule.value.tier_to_archive_after_days
          delete_after_days_since_modification_greater_than          = rule.value.delete_after_days
        }
        snapshot {
          delete_after_days_since_creation_greater_than = rule.value.delete_after_days
        }
      }
    }

  }

}

# Storage account private endpoints
resource "azurerm_private_endpoint" "blob" {
  count               = (length(var.containers_list) >= 1 || length(var.static_website) >= 1) ? 1 : 0
  name                = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-stra${substr(var.storage_account_name, -3, -1)}-blob"
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  subnet_id           = var.pe_subnet_id
  tags                = var.tags

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.blob_dns_zone]
  }

  private_service_connection {
    name                           = "${var.shared.naming.namingconstant}-pmpt-${var.shared.naming.loc}-stra${substr(var.storage_account_name, -3, -1)}-blob-psc"
    private_connection_resource_id = azurerm_storage_account.main.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }
}


resource "azurerm_private_endpoint" "queue" {
  count               = (length(var.queues) >= 1) || var.is_used_for_lgaps == true ? 1 : 0
  name                = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-stra${substr(var.storage_account_name, -3, -1)}-queue"
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  subnet_id           = var.pe_subnet_id
  tags                = var.tags

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.queue_dns_zone]
  }

  private_service_connection {
    name                           = "${var.shared.naming.namingconstant}-pmpt-${var.shared.naming.loc}-stra${substr(var.storage_account_name, -3, -1)}-queue-psc"
    private_connection_resource_id = azurerm_storage_account.main.id
    is_manual_connection           = false
    subresource_names              = ["queue"]
  }
}


resource "azurerm_private_endpoint" "table" {
  count               = length(var.tables) >= 1 ? 1 : 0
  name                = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-stra${substr(var.storage_account_name, -3, -1)}-table"
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  subnet_id           = var.pe_subnet_id
  tags                = var.tags

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.table_dns_zone]
  }

  private_service_connection {
    name                           = "${var.shared.naming.namingconstant}-pmpt-${var.shared.naming.loc}-stra${substr(var.storage_account_name, -3, -1)}-table-psc"
    private_connection_resource_id = azurerm_storage_account.main.id
    is_manual_connection           = false
    subresource_names              = ["table"]
  }
}


resource "azurerm_private_endpoint" "file" {
  count               = length(var.file_shares) >= 1 ? 1 : 0
  name                = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-stra${substr(var.storage_account_name, -3, -1)}-file"
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  subnet_id           = var.pe_subnet_id
  tags                = var.tags

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.file_dns_zone]
  }

  private_service_connection {
    name                           = "${var.shared.naming.namingconstant}-pmpt-${var.shared.naming.loc}-stra${substr(var.storage_account_name, -3, -1)}-file-psc"
    private_connection_resource_id = azurerm_storage_account.main.id
    is_manual_connection           = false
    subresource_names              = ["file"]
  }
}


resource "azurerm_private_endpoint" "web" {
  count               = length(var.static_website) >= 1 ? 1 : 0
  name                = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-stra${substr(var.storage_account_name, -3, -1)}-web"
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  subnet_id           = var.pe_subnet_id
  tags                = var.tags

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.web_dns_zone]
  }

  private_service_connection {
    name                           = "${var.shared.naming.namingconstant}-pmpt-${var.shared.naming.loc}-stra${substr(var.storage_account_name, -3, -1)}-web-psc"
    private_connection_resource_id = azurerm_storage_account.main.id
    is_manual_connection           = false
    subresource_names              = ["web"]
  }
}

# Storage network rules
resource "azurerm_storage_account_network_rules" "main" {
  count              = var.stra_network_rules_enabled == true ? 1 : 0
  storage_account_id = azurerm_storage_account.main.id
  default_action     = var.stra_network_rules_enabled == true ? "Deny" : "Allow"
  ip_rules           = [var.shared.ip_address]
  bypass             = var.bypass_allowed_azure_services

}

resource "azurerm_monitor_diagnostic_setting" "main-blob" {
  name                       = azurerm_storage_account.main.name
  target_resource_id         = "${azurerm_storage_account.main.id}/blobServices/default/"
  log_analytics_workspace_id = var.log_analytics_workspace_id


  enabled_log {
    category_group = "allLogs"
  }

  enabled_log {
    category_group = "audit"
  }

  enabled_metric {
    category = "Transaction"
  }

}

resource "azurerm_monitor_diagnostic_setting" "main-table" {
  name                       = azurerm_storage_account.main.name
  target_resource_id         = "${azurerm_storage_account.main.id}/tableServices/default/"
  log_analytics_workspace_id = var.log_analytics_workspace_id


  enabled_log {
    category_group = "allLogs"
  }

  enabled_log {
    category_group = "audit"
  }

  enabled_metric {
    category = "Transaction"
  }

}