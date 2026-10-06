# User Assigned Identity Resource
resource "azurerm_user_assigned_identity" "main" {
  count               = var.create_msid ? 1 : 0
  name                = "${var.shared.naming.namingconstant}-msid-${var.shared.naming.loc}-${format("%03d", count.index + 1)}"
  resource_group_name = var.shared.resg.name
  location            = var.shared.resg.location

  tags = merge(var.shared.tags, {
    "Purpose"       = "${upper(var.shared.naming.prefix)} Managed Identity"
    "Resource Name" = format("%s", var.shared.resg.name)
  })

}

