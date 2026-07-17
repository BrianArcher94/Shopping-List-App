data "azurerm_client_config" "current" {}

# Azure Key Vault Resource
resource "azurerm_key_vault" "main" {
  count                         = var.create_kyvt ? 1 : 0 # if "create_kyvt" variable = true count=1, else count=0
  name                          = "${var.shared.naming.namingconstant}-kyvt-${var.shared.naming.loc}-${format("%03d", count.index + 1)}"
  resource_group_name           = var.shared.resg.name
  location                      = var.shared.resg.location
  enabled_for_disk_encryption   = true
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days    = 7
  purge_protection_enabled      = true
  public_network_access_enabled = false

  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"

  }


  sku_name = "standard"

  rbac_authorization_enabled = false

  tags = merge(var.shared.tags, {
    "Purpose"       = "${upper(var.shared.naming.prefix)} Key Vault"
    "Resource Name" = format("%s", var.shared.resg.name)
  })
}

resource "azurerm_monitor_diagnostic_setting" "main-kyvt" {
  count                      = var.create_kyvt ? 1 : 0 # if "create_kyvt" variable = true count=1, else count=0
  name                       = azurerm_key_vault.main[0].name
  target_resource_id         = azurerm_key_vault.main[0].id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main[0].id

  enabled_log {
    category = "AuditEvent"
  }

  enabled_metric {
    category = "AllMetrics"
  }

}


resource "azurerm_private_endpoint" "kyvt" {
  count               = var.create_kyvt ? 1 : 0 # if "create_kyvt" variable = true count=1, else count=0
  name                = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-kyvt${format("%03d", count.index + 1)}"
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  subnet_id           = var.pe_subnet_id
  tags                = var.shared.tags

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.kyvt_dns_zone]
  }

  private_service_connection {
    name                           = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-kyvt${format("%03d", count.index + 1)}-psc"
    private_connection_resource_id = azurerm_key_vault.main[0].id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }
}


