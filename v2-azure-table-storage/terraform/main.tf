resource "azurerm_resource_group" "main" {
  count = 1
  name     = "${local.namingconstant}-resg-${local.loc}-${format("%03d", count.index + 1)}"
  location = local.location

  tags = merge(local.default_tags, {
    "Resource Name" = format("%s", "${local.namingconstant}-resg-${local.loc}-${format("%03d", count.index + 1)}")
  })

}


module "az-core" {
  source = "./modules/az-core"

  shared = local.shared

  create_kyvt   = true

  kyvt_dns_zone = module.az-dns.private_dns_zones["privatelink.vaultcore.azure.net"].id
  pe_subnet_id  = module.az-snet[4].subnet_id


  create_apin = true

  create_loga = true

  create_msid = true
}
