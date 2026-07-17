# Log Analytics Workspace Resource
resource "azurerm_log_analytics_workspace" "main" {
  count               = var.create_loga ? 1 : 0
  name                = "${var.shared.naming.namingconstant}-loga-${var.shared.naming.loc}-${format("%03d", count.index + 1)}"
  resource_group_name = var.shared.resg.name
  location            = var.shared.resg.location
  sku                 = "PerGB2018"
  retention_in_days   = "30"

  tags = merge(var.shared.tags, {
    "Purpose"       = "${upper(var.shared.naming.prefix)} Log Analytics"
    "Resource Name" = format("%s", var.shared.resg.name)
  })

}
