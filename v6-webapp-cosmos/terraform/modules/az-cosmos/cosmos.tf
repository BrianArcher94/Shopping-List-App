locals {
  # Default to a single region (the resource group's) when no geo_locations are passed.
  geo_locations = length(var.geo_locations) > 0 ? var.geo_locations : [
    {
      location          = var.shared.resg.location
      failover_priority = 0
      zone_redundant    = false
    }
  ]

  # Built-in data-plane roles: ...0001 = Data Reader, ...0002 = Data Contributor.
  data_role_definition_id = "${azurerm_cosmosdb_account.main.id}/sqlRoleDefinitions/${var.data_role_definition_guid}"
  data_role_scope         = "${azurerm_cosmosdb_account.main.id}/dbs/${azurerm_cosmosdb_sql_database.main.name}"
}

resource "azurerm_cosmosdb_account" "main" {
  name                               = var.cosmos_account_name
  location                           = var.shared.resg.location
  resource_group_name                = var.shared.resg.name
  offer_type                         = var.offer_type
  kind                               = var.kind
  local_authentication_disabled      = var.local_authentication_disabled
  access_key_metadata_writes_enabled = var.access_key_metadata_writes_enabled
  public_network_access_enabled      = var.public_network_access_enabled

  ip_range_filter = var.ip_range_filter

  network_acl_bypass_for_azure_services = var.network_acl_bypass_for_azure_services
  minimal_tls_version                   = var.minimal_tls_version

  dynamic "backup" {
    for_each = var.backup == null ? [] : [var.backup]

    content {
      type                = backup.value.type
      tier                = backup.value.tier
      interval_in_minutes = backup.value.interval_in_minutes
      retention_in_hours  = backup.value.retention_in_hours
      storage_redundancy  = backup.value.storage_redundancy
    }
  }

  dynamic "capabilities" {
    for_each = toset(var.capabilities)

    content {
      name = capabilities.value
    }
  }

  consistency_policy {
    consistency_level       = var.consistency_policy.consistency_level
    max_interval_in_seconds = var.consistency_policy.max_interval_in_seconds
    max_staleness_prefix    = var.consistency_policy.max_staleness_prefix
  }

  dynamic "geo_location" {
    for_each = local.geo_locations

    content {
      location          = geo_location.value.location
      failover_priority = geo_location.value.failover_priority
      zone_redundant    = geo_location.value.zone_redundant
    }
  }

  # Only needed for customer-managed keys or outbound features; the app authenticates with the UAMI
  # via data-plane RBAC, not the account's identity. Omitted when var.identity is null.
  dynamic "identity" {
    for_each = var.identity == null ? [] : [var.identity]

    content {
      type         = identity.value.type
      identity_ids = identity.value.identity_ids
    }
  }

  tags = var.tags
}

resource "azurerm_cosmosdb_sql_database" "main" {
  name                = var.database_name
  resource_group_name = var.shared.resg.name
  account_name        = azurerm_cosmosdb_account.main.name

}

resource "azurerm_cosmosdb_sql_container" "main" {
  for_each = var.containers

  name                  = each.key
  resource_group_name   = var.shared.resg.name
  account_name          = azurerm_cosmosdb_account.main.name
  database_name         = azurerm_cosmosdb_sql_database.main.name
  partition_key_paths   = each.value.partition_key_paths
  partition_key_kind    = each.value.partition_key_kind
  partition_key_version = each.value.partition_key_version
  default_ttl           = each.value.default_ttl

  indexing_policy {
    indexing_mode = each.value.indexing_mode

    dynamic "included_path" {
      for_each = each.value.included_paths

      content {
        path = included_path.value
      }
    }

    dynamic "excluded_path" {
      for_each = each.value.excluded_paths

      content {
        path = excluded_path.value
      }
    }

    dynamic "composite_index" {
      for_each = each.value.composite_indexes

      content {
        dynamic "index" {
          for_each = composite_index.value

          content {
            path  = index.value.path
            order = index.value.order
          }
        }
      }
    }
  }

  # Unique keys are scoped per logical partition and can only be set at container creation.
  dynamic "unique_key" {
    for_each = each.value.unique_keys

    content {
      paths = unique_key.value
    }
  }
}

resource "azurerm_cosmosdb_sql_role_assignment" "main" {
  for_each = var.data_contributors

  resource_group_name = var.shared.resg.name
  account_name        = azurerm_cosmosdb_account.main.name
  role_definition_id  = local.data_role_definition_id
  principal_id        = each.value
  scope               = local.data_role_scope
}

resource "azurerm_private_endpoint" "main" {
  name                = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-cosmos"
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  subnet_id           = var.pe_subnet_id

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.cosmos_dns_zone]
  }

  private_service_connection {
    name                           = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-${split("-", var.cosmos_account_name)[4]}-cosmos-psc"
    private_connection_resource_id = azurerm_cosmosdb_account.main.id
    is_manual_connection           = false
    subresource_names              = ["Sql"]
  }

  tags = var.tags
}

resource "azurerm_monitor_diagnostic_setting" "main" {
  name                       = azurerm_cosmosdb_account.main.name
  target_resource_id         = azurerm_cosmosdb_account.main.id
  log_analytics_workspace_id = var.log_analytics_id
  # Resource-specific tables (CDBDataPlaneRequests, CDBPartitionKeyRUConsumption, ...) instead of
  # the legacy shared AzureDiagnostics table.
  log_analytics_destination_type = "Dedicated"

  enabled_log {
    category_group = "allLogs"
  }

  # Cosmos DB exposes its platform metrics under "Requests", not "AllMetrics".
  enabled_metric {
    category = "Requests"
  }
}
