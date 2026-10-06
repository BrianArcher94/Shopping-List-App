locals {
  sql = {

    count = lookup(var.sql_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} SQL"
    }
  }
}

variable "sql_count" {
  description = "Number of Application Gateways per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

module "az-sql" {
  source = "./modules/az-sql"

  shared = local.shared
  count  = local.sql.count

  sql_server_name                   = "${local.namingconstant}-sql-${local.loc}-${format("%03d", count.index + 1)}"
  sql_server_version                = "12.0"
  public_network_access_enabled     = var.sql_public_access
  primary_user_assigned_identity_id = module.az-core.msid_id
  login_username                    = "<Username>"
  object_id                         = "<ObjectID>"
  identity_ids                      = [module.az-core.msid_id]

  sql_server_firewall_rule_name = "BA-IP"
  start_ip                      = local.shared.ip_address
  end_ip                        = local.shared.ip_address

  log_analytics_workspace_id = module.az-core.loga_id

  pe_subnet_id = module.az-snet[4].subnet_id
  sql_dns_zone = module.az-dns.private_dns_zones["privatelink.database.windows.net"].id

  sql_dbs = {
    SLA = {
      collation                   = "SQL_Latin1_General_CP1_CI_AS"
      max_size_gb                 = "2"
      min_capacity                = 0.5
      auto_pause_delay_in_minutes = 60
      sku_name                    = "GP_S_Gen5_1"
      storage_account_type        = "Local"
      geo_backup_enabled          = false
      zone_redundant              = false


    }
  }

  tags = merge(local.default_tags,
    lookup(local.sql.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.sql.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null

  )


}
