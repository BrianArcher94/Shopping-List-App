locals {
  lgaps = {

    count = lookup(var.lgaps_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} BA Testing"
    }
  }
}

variable "lgaps_count" {
  description = "Number of Logic Apps per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

module "az-lgaps" {
  source = "./modules/az-lgaps"

  shared = local.shared
  count  = local.lgaps.count

  lgaps_apsp_name = "${local.namingconstant}-lgaps-apsp-${local.loc}-${format("%03d", count.index + 1)}"
  lgaps_sku       = "WS1"
  lgaps_os_type   = "Windows"

  lgaps_name                 = "${local.namingconstant}-lgaps-${local.loc}-${format("%03d", count.index + 1)}"
  storage_account_name       = module.az-stra[0].stra_name.0
  storage_account_access_key = module.az-stra[0].stra_primary_access_key.0
  storage_account_share_name = one(keys(module.az-stra[0].stra_file_shares))


  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"            = "dotnet"
    FUNCTION_BASE_URL                     = "https://${module.az-fnap[0].fnap_default_hostname}"
    APPLICATIONINSIGHTS_CONNECTION_STRING = module.az-core.apin_connection_string
    WEBSITE_CONTENTOVERVNET               = 1
    WEBSITE_RUN_FROM_PACKAGE              = 1
  }

  public_network_access      = "Disabled"
  virtual_network_subnet_id  = module.az-snet[3].subnet_id
  vnet_content_share_enabled = true
  identity_ids               = [module.az-core.msid_id]

  site_config = [
    {
      vnet_route_all_enabled            = true
      ip_restriction_default_action     = "Deny"
      scm_ip_restriction_default_action = "Deny"
      scm_use_main_ip_restriction       = true
      dotnet_framework_version          = "v8.0"
    }
  ]

  pe_subnet_id     = module.az-snet[4].subnet_id
  lgaps_dns_zone   = module.az-dns.private_dns_zones["privatelink.azurewebsites.net"].id
  log_analytics_id = module.az-core.loga_id

  tags = merge(local.default_tags,
    lookup(local.lgaps.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.lgaps.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null

  )

}
