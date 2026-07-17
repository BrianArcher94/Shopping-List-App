locals {
  wapp = {

    count = lookup(var.wapp_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} BA Testing"
    }
  }
}

variable "wapp_count" {
  description = "Number of Web Apps per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

module "az-wapp" {
  source = "./modules/az-wapp"

  count  = local.wapp.count
  shared = local.shared

  wapp_apsp_name = "${local.namingconstant}-wapp-apsp-${local.loc}-${format("%03d", count.index + 1)}"
  wapp_os_type   = "Linux"
  wapp_sku       = "B1"

  wapp_name = "${local.namingconstant}-wapp-${local.loc}-${format("%03d", count.index + 1)}"


  app_settings = {
    APPLICATIONINSIGHTS_CONNECTION_STRING      = module.az-core.apin_connection_string
    ApplicationInsightsAgent_EXTENSION_VERSION = "~3"
    XDT_MicrosoftApplicationInsights_Mode      = "recommended"
    WEBSITE_RUN_FROM_PACKAGE                   = 1
    SCM_DO_BUILD_DURING_DEPLOYMENT             = false
    WEBSITES_CONTAINER_START_TIME_LIMIT        = 230
    health_check_path                          = "/healthz"
    health_check_eviction_time_in_min          = 2
    API_PROXY_TARGET                           = length(module.az-fnap) > 0 ? "https://${module.az-fnap[0].fnap_default_hostname}" : ""
  }

  public_network_access_enabled = false
  wapp_subnet_id                = module.az-snet[1].subnet_id
  identity_ids                  = [module.az-core.msid_id]

  key_vault_reference_identity_id = module.az-core.msid_id

  site_config = [
    {
      always_on              = true
      vnet_route_all_enabled = true

      application_stack = [
        {
          node_version = "24-lts"
        }
      ]

      ip_restriction_default_action     = "Deny"
      scm_ip_restriction_default_action = "Deny"
      scm_use_main_ip_restriction       = true
    }
  ]

  pe_subnet_id     = module.az-snet[4].subnet_id
  wapp_dns_zone    = module.az-dns.private_dns_zones["privatelink.azurewebsites.net"].id
  log_analytics_id = module.az-core.loga_id

  enable_custom_hostname          = true
  hostname                        = "<URL>"
  key_vault_id = module.az-core.kyvt_id
  certificate_key_vault_secret_id = azurerm_key_vault_secret.main-ssl.versionless_id



  tags = merge(local.default_tags,
    lookup(local.wapp.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.wapp.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null

  )

  depends_on = [ 
    azurerm_key_vault_access_policy.apsp-kyvt-access
   ]

}
