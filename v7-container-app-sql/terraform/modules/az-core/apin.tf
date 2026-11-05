# Application Insights Resource
resource "azurerm_application_insights" "main" {
  count               = var.create_apin ? 1 : 0 # If "create_apin" variable = true count=1, else count=0
  name                = "${var.shared.naming.namingconstant}-apin-${var.shared.naming.loc}-${format("%03d", count.index + 1)}"
  resource_group_name = var.shared.resg.name
  location            = var.shared.resg.location
  application_type    = "web"
  workspace_id        = azurerm_log_analytics_workspace.main[0].id

  local_authentication_disabled = false

  tags = merge(var.shared.tags, {
    "Purpose"       = "${upper(var.shared.naming.prefix)} Application Insights"
    "Resource Name" = format("%s", var.shared.resg.name)
  })
}
