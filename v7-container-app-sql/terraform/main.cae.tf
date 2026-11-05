locals {
  cae = {

    count = lookup(var.cae_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} Container Apps Environment"
    }
  }
}

variable "cae_count" {
  description = "Number of Container Apps environments per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-uks" = 0
  }

}

# Internal (ILB) workload-profiles environment in snet-cae. Created in pass 1 with the
# rest of the infrastructure; the web app on top of it is gated by deploy_container_apps.
module "az-ce" {
  source = "./modules/az-ce"

  shared = local.shared
  count  = local.cae.count

  ce_name                    = "${local.namingconstant}-cae-${local.loc}-${format("%03d", count.index + 1)}"
  log_analytics_workspace_id = module.az-core.loga_id
  infrastructure_subnet_id   = local.snet_id["cae"]

  internal_load_balancer_enabled     = true
  infrastructure_resource_group_name = "${local.namingconstant}-resg-cae-${local.loc}-${format("%03d", count.index + 1)}"

  tags = merge(local.default_tags,
    lookup(local.cae.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.cae.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null
  )

}

# -----------------------------------------------------------------------------
# Private DNS for the environment's default domain (plan §11.3)
#
# An internal environment publishes no public DNS. Apps get FQDNs like
# <app>.<default_domain>, all served by the environment's ILB static IP, so a zone named
# after the default domain with wildcard and apex A records lets App Gateway (and
# anything else in the spoke) resolve them. Kept outside az-dns because the zone name is
# only known once the environment exists.
# -----------------------------------------------------------------------------

resource "azurerm_private_dns_zone" "cae" {
  count = local.cae.count

  name                = module.az-ce[count.index].default_domain
  resource_group_name = local.shared.resg.name

  tags = local.default_tags
}

resource "azurerm_private_dns_a_record" "cae-wildcard" {
  count = local.cae.count

  name                = "*"
  zone_name           = azurerm_private_dns_zone.cae[count.index].name
  resource_group_name = local.shared.resg.name
  ttl                 = 300
  records             = [module.az-ce[count.index].static_ip_address]

  tags = local.default_tags
}

resource "azurerm_private_dns_a_record" "cae-apex" {
  count = local.cae.count

  name                = "@"
  zone_name           = azurerm_private_dns_zone.cae[count.index].name
  resource_group_name = local.shared.resg.name
  ttl                 = 300
  records             = [module.az-ce[count.index].static_ip_address]

  tags = local.default_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "cae-spoke" {
  count = local.cae.count

  name                  = "${local.namingconstant}-cae-${local.loc}-${format("%03d", count.index + 1)}-spoke-vnet-link"
  resource_group_name   = local.shared.resg.name
  private_dns_zone_name = azurerm_private_dns_zone.cae[count.index].name
  virtual_network_id    = module.az-vnet[0].vnet_id
  registration_enabled  = false

  tags = local.default_tags
}
