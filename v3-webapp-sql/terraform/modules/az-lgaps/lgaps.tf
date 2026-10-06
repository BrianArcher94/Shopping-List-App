resource "azurerm_service_plan" "main-lgaps" {
  name                = var.lgaps_apsp_name
  resource_group_name = var.shared.resg.name
  location            = var.shared.resg.location
  os_type             = var.lgaps_os_type
  sku_name            = var.lgaps_sku

  tags = var.tags
}

resource "azurerm_logic_app_standard" "main" {
  name                = var.lgaps_name
  resource_group_name = var.shared.resg.name
  location            = var.shared.resg.location
  app_service_plan_id = azurerm_service_plan.main-lgaps.id

  storage_account_name       = var.storage_account_name
  storage_account_access_key = var.storage_account_access_key
  storage_account_share_name = var.storage_account_share_name

  # app_settings has no fixed schema - arbitrary key/value pairs such as
  # FUNCTIONS_WORKER_RUNTIME or APPLICATIONINSIGHTS_CONNECTION_STRING.
  app_settings = var.app_settings

  use_extension_bundle = var.use_extension_bundle
  bundle_version       = var.bundle_version

  client_affinity_enabled                  = var.client_affinity_enabled
  client_certificate_mode                  = var.client_certificate_mode
  enabled                                  = var.enabled
  ftp_publish_basic_authentication_enabled = var.ftp_publish_basic_authentication_enabled
  scm_publish_basic_authentication_enabled = var.scm_publish_basic_authentication_enabled
  https_only                               = var.https_only
  public_network_access                    = var.public_network_access
  version                                  = var.logic_app_version
  virtual_network_subnet_id                = var.virtual_network_subnet_id
  vnet_content_share_enabled               = var.vnet_content_share_enabled

  identity {
    type         = var.identity_ids != null ? "SystemAssigned, UserAssigned" : "SystemAssigned"
    identity_ids = var.identity_ids
  }

  dynamic "connection_string" {
    for_each = var.connection_strings

    content {
      name  = connection_string.value.name
      type  = connection_string.value.type
      value = connection_string.value.value
    }
  }

  dynamic "site_config" {
    for_each = var.site_config

    content {
      always_on                         = lookup(site_config.value, "always_on", false)
      app_scale_limit                   = lookup(site_config.value, "app_scale_limit", null)
      auto_swap_slot_name               = lookup(site_config.value, "auto_swap_slot_name", null)
      dotnet_framework_version          = lookup(site_config.value, "dotnet_framework_version", null)
      elastic_instance_minimum          = lookup(site_config.value, "elastic_instance_minimum", null)
      ftps_state                        = lookup(site_config.value, "ftps_state", "Disabled")
      health_check_path                 = lookup(site_config.value, "health_check_path", null)
      http2_enabled                     = lookup(site_config.value, "http2_enabled", false)
      ip_restriction_default_action     = lookup(site_config.value, "ip_restriction_default_action", "Allow")
      scm_ip_restriction_default_action = lookup(site_config.value, "scm_ip_restriction_default_action", "Allow")
      scm_use_main_ip_restriction       = lookup(site_config.value, "scm_use_main_ip_restriction", false)
      scm_min_tls_version               = lookup(site_config.value, "scm_min_tls_version", "1.2")
      scm_type                          = lookup(site_config.value, "scm_type", null)
      linux_fx_version                  = lookup(site_config.value, "linux_fx_version", null)
      min_tls_version                   = lookup(site_config.value, "min_tls_version", "1.2")
      pre_warmed_instance_count         = lookup(site_config.value, "pre_warmed_instance_count", null)
      runtime_scale_monitoring_enabled  = lookup(site_config.value, "runtime_scale_monitoring_enabled", null)
      use_32_bit_worker_process         = lookup(site_config.value, "use_32_bit_worker_process", false)
      vnet_route_all_enabled            = lookup(site_config.value, "vnet_route_all_enabled", false)
      websockets_enabled                = lookup(site_config.value, "websockets_enabled", false)

      dynamic "cors" {
        for_each = lookup(site_config.value, "cors", [])

        content {
          allowed_origins     = lookup(cors.value, "allowed_origins", null)
          support_credentials = lookup(cors.value, "support_credentials", false)
        }
      }

      dynamic "ip_restriction" {
        for_each = lookup(site_config.value, "ip_restriction", [])

        content {
          action                    = lookup(ip_restriction.value, "action", "Allow")
          ip_address                = lookup(ip_restriction.value, "ip_address", null)
          name                      = lookup(ip_restriction.value, "name", null)
          priority                  = lookup(ip_restriction.value, "priority", 65000)
          service_tag               = lookup(ip_restriction.value, "service_tag", null)
          virtual_network_subnet_id = lookup(ip_restriction.value, "virtual_network_subnet_id", null)
          description               = lookup(ip_restriction.value, "description", null)

          dynamic "headers" {
            for_each = lookup(ip_restriction.value, "headers", [])

            content {
              x_azure_fdid      = lookup(headers.value, "x_azure_fdid", null)
              x_fd_health_probe = lookup(headers.value, "x_fd_health_probe", null)
              x_forwarded_for   = lookup(headers.value, "x_forwarded_for", null)
              x_forwarded_host  = lookup(headers.value, "x_forwarded_host", null)
            }
          }
        }
      }

      dynamic "scm_ip_restriction" {
        for_each = lookup(site_config.value, "scm_ip_restriction", [])

        content {
          action                    = lookup(scm_ip_restriction.value, "action", "Allow")
          ip_address                = lookup(scm_ip_restriction.value, "ip_address", null)
          name                      = lookup(scm_ip_restriction.value, "name", null)
          priority                  = lookup(scm_ip_restriction.value, "priority", 65000)
          service_tag               = lookup(scm_ip_restriction.value, "service_tag", null)
          virtual_network_subnet_id = lookup(scm_ip_restriction.value, "virtual_network_subnet_id", null)
          description               = lookup(scm_ip_restriction.value, "description", null)

          dynamic "headers" {
            for_each = lookup(scm_ip_restriction.value, "headers", [])

            content {
              x_azure_fdid      = lookup(headers.value, "x_azure_fdid", null)
              x_fd_health_probe = lookup(headers.value, "x_fd_health_probe", null)
              x_forwarded_for   = lookup(headers.value, "x_forwarded_for", null)
              x_forwarded_host  = lookup(headers.value, "x_forwarded_host", null)
            }
          }
        }
      }
    }
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "main" {
  name                = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-lgaps-sites"
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  subnet_id           = var.pe_subnet_id
  tags                = var.tags

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.lgaps_dns_zone]
  }

  private_service_connection {
    name                           = "${var.shared.naming.namingconstant}-pmpt-${var.shared.naming.loc}-${split("-", var.lgaps_apsp_name)[4]}-sites-psc"
    private_connection_resource_id = azurerm_logic_app_standard.main.id
    is_manual_connection           = false
    subresource_names              = ["sites"]
  }
}

resource "azurerm_monitor_diagnostic_setting" "main" {
  name                       = azurerm_logic_app_standard.main.name
  target_resource_id         = azurerm_logic_app_standard.main.id
  log_analytics_workspace_id = var.log_analytics_id

  enabled_log {
    category = "WorkflowRuntime"
  }

  enabled_log {
    category = "FunctionAppLogs"
  }
}
