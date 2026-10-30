locals {
  cosmos = {

    count = lookup(var.cosmos_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} cosmos"
    }
  }
}

variable "cosmos_count" {
  description = "Number of CosmosDB resources per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

module "az-cosmos" {
  source = "./modules/az-cosmos"

  shared = local.shared
  count  = local.cosmos.count

  cosmos_account_name = "${local.namingconstant}-cosmos-${local.loc}-${format("%03d", count.index + 1)}"
  database_name       = "sla"

  # Names are hard-coded in function/src/shared/cosmos.ts. Partition key paths are fixed at creation
  # (changing one replaces the container and deletes its data). Lean indexing: only the sort paths
  # used by History (weekStartDate) and Favourites (normalisedName) are indexed.
  containers = {
    shoppingLists = {
      partition_key_paths = ["/weekStartDate"]
      included_paths      = ["/weekStartDate/?", "/status/?"]
      excluded_paths      = ["/*"]
    }
    favouriteItems = {
      partition_key_paths = ["/id"]
      included_paths      = ["/normalisedName/?"]
      excluded_paths      = ["/*"]
    }
  }

  public_network_access_enabled = true
  ip_range_filter               = [local.shared.ip_address]
  data_contributors = {
    "uami" = module.az-core.msid_principal_id,
    "me"   = "<ObjectID>"
  }

  pe_subnet_id     = module.az-snet[4].subnet_id
  cosmos_dns_zone  = module.az-dns.private_dns_zones["privatelink.documents.azure.com"].id
  log_analytics_id = module.az-core.loga_id

  tags = merge(local.default_tags,
    lookup(local.cosmos.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.cosmos.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null
  )
}
