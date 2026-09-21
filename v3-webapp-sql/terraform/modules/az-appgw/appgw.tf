resource "azurerm_public_ip" "main" {
  name                = var.pip_name
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  allocation_method   = var.pip_allocation_method
  sku                 = var.pip_sku

  tags = var.tags


}

resource "azurerm_application_gateway" "main" {
  name                = var.appgw_name
  resource_group_name = var.shared.resg.name
  location            = var.shared.resg.location

  identity {
    type         = "UserAssigned"
    identity_ids = var.identity_ids
  }

  sku {
      name = var.appgw_sku.name
      tier = var.appgw_sku.tier
      capacity = var.appgw_sku.capacity
    }

  gateway_ip_configuration {
    name = var.gateway_ip_configuration.name
    subnet_id = var.gateway_ip_configuration.subnet_id
  }

  dynamic "frontend_ip_configuration" {
    for_each = var.frontend_ip_configuration_private.name == null ? [] : [var.frontend_ip_configuration_private]

    content {
      name = frontend_ip_configuration.value.name
      private_ip_address = frontend_ip_configuration.value.private_ip_address
      private_ip_address_allocation = frontend_ip_configuration.value.private_ip_address_allocation
      private_link_configuration_name = frontend_ip_configuration.value.private_link_configuration_name
      subnet_id = frontend_ip_configuration.value.subnet_id
    }
  }

  dynamic "frontend_ip_configuration" {
    for_each = var.frontend_ip_configuration_public.name == null ? [] : [var.frontend_ip_configuration_public]

    content {
      name = frontend_ip_configuration.value.name
      public_ip_address_id = azurerm_public_ip.main.id
    }
  }

  dynamic "frontend_port" {
    for_each = var.frontend_port

    content {
      name = frontend_port.value.name
      port = frontend_port.value.port
    }
    
  }

  dynamic "trusted_root_certificate" {
    for_each = var.trusted_root_certificate == null ? {} : var.trusted_root_certificate

    content {
      name                = trusted_root_certificate.value.name
      data                = trusted_root_certificate.value.data
      key_vault_secret_id = trusted_root_certificate.value.key_vault_secret_id
    }
  }

  dynamic "ssl_certificate" {
    for_each = var.ssl_certificates == null ? {} : var.ssl_certificates

    content {
      name                = ssl_certificate.value.name
      data                = ssl_certificate.value.data
      key_vault_secret_id = ssl_certificate.value.key_vault_secret_id
      password            = ssl_certificate.value.password
    }
  }

  dynamic "backend_address_pool" {
    for_each = var.backend_address_pools

    content {
      name         = backend_address_pool.value.name
      fqdns        = backend_address_pool.value.fqdns != null ? backend_address_pool.value.fqdns : null
      ip_addresses = backend_address_pool.value.ip_addresses != null ? backend_address_pool.value.ip_addresses : null
    }
  }

  dynamic "probe" {
    for_each = var.probe_configurations != null ? var.probe_configurations : {}

    content {
      interval                                  = probe.value.interval
      name                                      = probe.value.name
      path                                      = probe.value.path
      protocol                                  = probe.value.protocol
      timeout                                   = probe.value.timeout
      unhealthy_threshold                       = probe.value.unhealthy_threshold
      host                                      = probe.value.host
      minimum_servers                           = probe.value.minimum_servers
      pick_host_name_from_backend_http_settings = probe.value.pick_host_name_from_backend_http_settings
      port                                      = probe.value.port
    }
  }

  dynamic "backend_http_settings" {
    for_each = var.backend_http_settings

    content {
      cookie_based_affinity                = backend_http_settings.value.cookie_based_affinity
      name                                 = backend_http_settings.value.name
      port                                 = backend_http_settings.value.port
      protocol                             = backend_http_settings.value.protocol
      affinity_cookie_name                 = backend_http_settings.value.affinity_cookie_name
      dedicated_backend_connection_enabled = backend_http_settings.value.dedicated_backend_connection_enabled
      host_name                            = backend_http_settings.value.host_name
      path                                 = backend_http_settings.value.path
      pick_host_name_from_backend_address  = backend_http_settings.value.pick_host_name_from_backend_address
      probe_name                           = backend_http_settings.value.probe_name
      request_timeout                      = backend_http_settings.value.request_timeout
      trusted_root_certificate_names       = backend_http_settings.value.trusted_root_certificate_names

      dynamic "authentication_certificate" {
        for_each = backend_http_settings.value.authentication_certificate == null ? [] : backend_http_settings.value.authentication_certificate

        content {
          name = authentication_certificate.value.name
        }
      }
      dynamic "connection_draining" {
        for_each = backend_http_settings.value.connection_draining == null ? [] : [backend_http_settings.value.connection_draining]

        content {
          drain_timeout_sec = connection_draining.value.drain_timeout_sec
          enabled           = connection_draining.value.enable_connection_draining
        }
      }
    }
  }

  dynamic "http_listener" {
    for_each = var.http_listeners

    content {
      frontend_ip_configuration_name = http_listener.value.frontend_ip_configuration_name
      frontend_port_name   = http_listener.value.frontend_port_name
      name                 = http_listener.value.name
      protocol             = http_listener.value.protocol
      firewall_policy_id   = http_listener.value.firewall_policy_id
      host_name            = http_listener.value.host_name
      host_names           = http_listener.value.host_names
      require_sni          = http_listener.value.require_sni
      ssl_certificate_name = http_listener.value.ssl_certificate_name
      ssl_profile_name     = http_listener.value.ssl_profile_name

      dynamic "custom_error_configuration" {
        for_each = http_listener.value.custom_error_configuration != null ? lookup(http_listener.value, "custom_error_configuration", {}) : []

        content {
          custom_error_page_url = lookup(custom_error_configuration.value, "custom_error_page_url", null)
          status_code           = lookup(custom_error_configuration.value, "status_code", null)
        }
      }
    }
  }

  dynamic "redirect_configuration" {
    for_each = var.redirect_configuration != null ? var.redirect_configuration : {}

    content {
      name                 = redirect_configuration.value.name
      redirect_type        = redirect_configuration.value.redirect_type
      include_path         = redirect_configuration.value.include_path
      include_query_string = redirect_configuration.value.include_query_string
      target_listener_name = redirect_configuration.value.target_listener_name
      target_url           = redirect_configuration.value.target_url
    }
  }

  dynamic "request_routing_rule" {
    for_each = var.request_routing_rules

    content {
      http_listener_name          = request_routing_rule.value.http_listener_name
      name                        = request_routing_rule.value.name
      rule_type                   = request_routing_rule.value.rule_type
      backend_address_pool_name   = request_routing_rule.value.backend_address_pool_name
      backend_http_settings_name  = request_routing_rule.value.backend_http_settings_name
      priority                    = request_routing_rule.value.priority
      redirect_configuration_name = request_routing_rule.value.redirect_configuration_name
      rewrite_rule_set_name       = request_routing_rule.value.rewrite_rule_set_name
      url_path_map_name           = request_routing_rule.value.url_path_map_name
    }
  }

  tags = var.tags


}

resource "azurerm_monitor_diagnostic_setting" "main" {
  name                       = azurerm_application_gateway.main.name
  target_resource_id         = azurerm_application_gateway.main.id
  log_analytics_workspace_id = var.log_analytics_id

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}