locals {
  fnap = {

    count = lookup(var.fnap_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} BA Testing"
    }
  }
}

variable "fnap_count" {
  description = "Number of Function Apps per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

module "az-fnap" {
  source = "./modules/az-fnap"

  shared = local.shared
  count  = local.fnap.count

  fnap_apsp_name = "${local.namingconstant}-fnap-apsp-${local.loc}-${format("%03d", count.index + 1)}"
  fnap_sku       = "FC1"
  fnap_os_type   = "Linux"

  fnap_name                         = "${local.namingconstant}-fnap-${local.loc}-${format("%03d", count.index + 1)}"
  storage_container_type            = "blobContainer"
  storage_container_endpoint        = "https://${module.az-stra[0].stra_name[0]}.blob.core.windows.net/fnap-data"
  storage_authentication_type       = "UserAssignedIdentity"
  storage_user_assigned_identity_id = module.az-core.msid_id
  runtime_name                      = "node"
  runtime_version                   = "24"

  app_settings = {
    STORAGE_ACCOUNT_NAME                  = module.az-stra[0].stra_name.0
    AZURE_CLIENT_ID                       = module.az-core.msid_client_id
    APPLICATIONINSIGHTS_CONNECTION_STRING = module.az-core.apin_connection_string
  }

  public_network_access_enabled = false
  virtual_network_subnet_id     = module.az-snet[2].subnet_id
  identity_ids                  = [module.az-core.msid_id]

  site_config = [
    {
      vnet_route_all_enabled = true

      ip_restriction_default_action     = "Deny"
      scm_ip_restriction_default_action = "Deny"
      scm_use_main_ip_restriction       = true
    }
  ]

  pe_subnet_id     = module.az-snet[4].subnet_id
  fnap_dns_zone    = module.az-dns.private_dns_zones["privatelink.azurewebsites.net"].id
  log_analytics_id = module.az-core.loga_id

  tags = merge(local.default_tags,
    lookup(local.fnap.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.fnap.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null

  )

}