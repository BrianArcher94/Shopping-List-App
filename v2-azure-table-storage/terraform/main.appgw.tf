locals {
  appgw = {

    count = lookup(var.appgw_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} SLATBL APPGW"
    }
  }
}

variable "appgw_count" {
  description = "Number of Application Gateways per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

module "az-appgw" {
  source = "./modules/az-appgw"

  shared = local.shared
  count  = local.appgw.count

  pip_name              = "${local.namingconstant}-pip-${local.loc}-${format("%03d", count.index + 1)}"
  pip_allocation_method = "Static"
  pip_sku               = "Standard"

  appgw_name   = "${local.namingconstant}-appgw-${local.loc}-${format("%03d", count.index + 1)}"
  identity_ids = [module.az-core.msid_id]

  appgw_sku = {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 1
  }

  gateway_ip_configuration = {
    name      = "appgw-ip-config"
    subnet_id = module.az-snet[0].subnet_id
  }

  frontend_port = {
    http = {
      name = "http"
      port = 80
    },
    https = {
      name = "https"
      port = 443
    }
  }

  trusted_root_certificate = {
    root = {
      name = "Cloudflare-Origin-CA-Root"
      data = filebase64("${path.module}/cert/origin_ca_rsa_root.pem")
    }
  }

  ssl_certificates = {
    ssl = {
      name                = "${azurerm_key_vault_secret.main-ssl.name}"
      key_vault_secret_id = "${azurerm_key_vault_secret.main-ssl.versionless_id}"
    }
  }

  backend_address_pools = {
    sla = {
      name  = "slatbl-wapp"
      fqdns = [module.az-wapp[0].wapp_default_hostname]
    }
  }

  probe_configurations = {
    slaprobe = {
      name                                      = "slatbl-probe"
      protocol                                  = "Https"
      port                                      = 443
      path                                      = "/healthz"
      interval                                  = 30
      timeout                                   = 30
      unhealthy_threshold                       = 3
      pick_host_name_from_backend_http_settings = false
      host                                      = "<URL>"
    }
  }

  backend_http_settings = {
    https-settings = {
      name                                = "https-settings"
      protocol                            = "Https"
      port                                = 443
      request_timeout                     = 60
      pick_host_name_from_backend_address = false
      host_name                           = "<URL>"
      probe_name                          = try("slatbl-probe", null)
      cookie_based_affinity               = "Enabled"

      connection_draining = {
        enable_connection_draining = true
        drain_timeout_sec          = 30
      }

      trusted_root_certificate_names = ["Cloudflare-Origin-CA-Root"]
    },
    http-settings = {
      name                  = "http-settings"
      protocol              = "Http"
      port                  = 80
      request_timeout       = 60
      cookie_based_affinity = "Enabled"
    }
  }

  http_listeners = {
    http-listener = {
      name                           = "http-listener"
      frontend_ip_configuration_name = "public"
      frontend_port_name             = "http"
      protocol                       = "Http"
      host_name                      = "<URL"

    },
    https-listener = {
      name                           = "https-listener"
      frontend_ip_configuration_name = "public"
      frontend_port_name             = "https"
      protocol                       = "Https"
      host_name                      = "<URL"
      ssl_certificate_name           = "${azurerm_key_vault_secret.main-ssl.name}"
    }
  }


  redirect_configuration = {
    http-to-https = {
      name                 = "http-to-https"
      redirect_type        = "Permanent"
      target_listener_name = "https-listener"
      include_path         = true
      include_query_string = true
    }
  }

  request_routing_rules = {
    http-routing-rule = {
      name                        = "http-routing-rule"
      rule_type                   = "Basic"
      http_listener_name          = "http-listener"
      redirect_configuration_name = "http-to-https"
      priority                    = 100
    },
    https-routing-rule = {
      name                       = "https-routing-rule"
      rule_type                  = "Basic"
      http_listener_name         = "https-listener"
      backend_address_pool_name  = "slatbl-wapp"
      backend_http_settings_name = "https-settings"
      priority                   = 101
    }
  }

  log_analytics_id = module.az-core.loga_id

  depends_on = [ module.az-nsg[0] ]

}
