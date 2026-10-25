locals {
  pgsql = {

    count = lookup(var.pgsql_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} PGSQL"
    }
  }
}

variable "pgsql_count" {
  description = "Number of PostgresSQL resources per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

module "az-pgsql" {
  source = "./modules/az-pgsql"

  shared = local.shared
  count  = local.pgsql.count

  postgres_server_name          = "${local.namingconstant}-pgsql-${local.loc}-${format("%03d", count.index + 1)}"
  public_network_access_enabled = true

  postgres_config = {
    sku_name        = "B_Standard_B1ms"
    version         = "17"
    storage_tier    = "P4"
    storage_size_gb = 32
  }

  active_directory_auth_enabled = true
  tenant_id                     = data.azurerm_client_config.current.tenant_id

  identity_ids     = [module.az-core.msid_id]
  log_analytics_id = module.az-core.loga_id

  pgsql_dbs = ["sla"]
  pgsql_admins = {
    "<MiName>" = {
      object_id      = "<MiID>"
      principal_type = "ServicePrincipal"
    },
    "<Username>" = {
      object_id      = "<ObjectID>"
      principal_type = "User"
    }
  }

  pe_subnet_id   = module.az-snet[4].subnet_id
  pgsql_dns_zone = module.az-dns.private_dns_zones["privatelink.postgres.database.azure.com"].id

  tags = merge(local.default_tags,
    lookup(local.pgsql.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.pgsql.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null
  )

}