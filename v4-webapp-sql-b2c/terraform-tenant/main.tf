resource "azurerm_resource_group" "main" {
  count    = 1
  name     = "${local.namingconstant}-ciam-resg-${local.loc}-${format("%03d", count.index + 1)}"
  location = local.location

  tags = merge(local.default_tags, {
    "Resource Name" = format("%s", "${local.namingconstant}-ciam-resg-${local.loc}-${format("%03d", count.index + 1)}")
  })

}