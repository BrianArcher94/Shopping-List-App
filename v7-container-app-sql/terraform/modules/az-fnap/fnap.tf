resource "azurerm_service_plan" "main-fnapp" {
  name                = var.fnap_apsp_name
  resource_group_name = var.shared.resg.name
  location            = var.shared.resg.location
  sku_name            = var.fnap_sku
  os_type             = var.fnap_os_type
}

resource "azurerm_function_app_flex_consumption" "main" {
  name                = var.fnap_name
  resource_group_name = var.shared.resg.name
  location            = var.shared.resg.location
  service_plan_id     = azurerm_service_plan.main-fnapp.id

  storage_container_type            = var.storage_container_type
  storage_container_endpoint        = var.storage_container_endpoint
  storage_authentication_type       = var.storage_authentication_type
  storage_user_assigned_identity_id = var.storage_user_assigned_identity_id
  runtime_name                      = var.runtime_name
  runtime_version                   = var.runtime_version
  maximum_instance_count            = var.max_instance_count
  instance_memory_in_mb             = var.instance_memory_in_mb

  # app_settings has no fixed schema - arbitrary key/value pairs such as
  # AzureWebJobsStorage__accountName or APPLICATIONINSIGHTS_CONNECTION_STRING.
  app_settings = var.app_settings

  https_only                    = var.https_only
  public_network_access_enabled = var.public_network_access_enabled
  virtual_network_subnet_id     = var.virtual_network_subnet_id

  identity {
    type         = var.identity_ids != null ? "SystemAssigned, UserAssigned" : "SystemAssigned"
    identity_ids = var.identity_ids
  }

  dynamic "site_config" {
    for_each = var.site_config

    content {
      api_definition_url                            = lookup(site_config.value, "api_definition_url", null)
      api_management_api_id                         = lookup(site_config.value, "api_management_api_id", null)
      app_command_line                              = lookup(site_config.value, "app_command_line", null)
      application_insights_connection_string        = lookup(site_config.value, "application_insights_connection_string", null)
      application_insights_key                      = lookup(site_config.value, "application_insights_key", null)
      container_registry_managed_identity_client_id = lookup(site_config.value, "container_registry_managed_identity_client_id", null)
      container_registry_use_managed_identity       = lookup(site_config.value, "container_registry_use_managed_identity", false)
      default_documents                             = lookup(site_config.value, "default_documents", null)
      health_check_path                             = lookup(site_config.value, "health_check_path", null)
      health_check_eviction_time_in_min             = lookup(site_config.value, "health_check_eviction_time_in_min", null)
      http2_enabled                                 = lookup(site_config.value, "http2_enabled", false)
      ip_restriction_default_action                 = lookup(site_config.value, "ip_restriction_default_action", "Allow")
      load_balancing_mode                           = lookup(site_config.value, "load_balancing_mode", "LeastRequests")
      managed_pipeline_mode                         = lookup(site_config.value, "managed_pipeline_mode", "Integrated")
      minimum_tls_version                           = lookup(site_config.value, "minimum_tls_version", "1.2")
      remote_debugging_enabled                      = lookup(site_config.value, "remote_debugging_enabled", false)
      remote_debugging_version                      = lookup(site_config.value, "remote_debugging_version", null)
      runtime_scale_monitoring_enabled              = lookup(site_config.value, "runtime_scale_monitoring_enabled", null)
      scm_ip_restriction_default_action             = lookup(site_config.value, "scm_ip_restriction_default_action", "Allow")
      scm_minimum_tls_version                       = lookup(site_config.value, "scm_minimum_tls_version", "1.2")
      scm_use_main_ip_restriction                   = lookup(site_config.value, "scm_use_main_ip_restriction", false)
      use_32_bit_worker                             = lookup(site_config.value, "use_32_bit_worker", false)
      vnet_route_all_enabled                        = lookup(site_config.value, "vnet_route_all_enabled", false)
      websockets_enabled                            = lookup(site_config.value, "websockets_enabled", false)
      worker_count                                  = lookup(site_config.value, "worker_count", null)

      dynamic "app_service_logs" {
        for_each = lookup(site_config.value, "app_service_logs", [])

        content {
          disk_quota_mb         = lookup(app_service_logs.value, "disk_quota_mb", 35)
          retention_period_days = lookup(app_service_logs.value, "retention_period_days", null)
        }
      }

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

  dynamic "auth_settings" {
    for_each = var.auth_settings

    content {
      enabled                        = lookup(auth_settings.value, "enabled", false)
      additional_login_parameters    = lookup(auth_settings.value, "additional_login_parameters", null)
      allowed_external_redirect_urls = lookup(auth_settings.value, "allowed_external_redirect_urls", null)
      default_provider               = lookup(auth_settings.value, "default_provider", null)
      issuer                         = lookup(auth_settings.value, "issuer", null)
      runtime_version                = lookup(auth_settings.value, "runtime_version", null)
      token_refresh_extension_hours  = lookup(auth_settings.value, "token_refresh_extension_hours", 72)
      token_store_enabled            = lookup(auth_settings.value, "token_store_enabled", false)
      unauthenticated_client_action  = lookup(auth_settings.value, "unauthenticated_client_action", null)

      dynamic "active_directory" {
        for_each = lookup(auth_settings.value, "active_directory", [])

        content {
          client_id                  = lookup(active_directory.value, "client_id", null)
          client_secret              = lookup(active_directory.value, "client_secret", null)
          client_secret_setting_name = lookup(active_directory.value, "client_secret_setting_name", null)
          allowed_audiences          = lookup(active_directory.value, "allowed_audiences", null)
        }
      }

      dynamic "facebook" {
        for_each = lookup(auth_settings.value, "facebook", [])

        content {
          app_id                  = lookup(facebook.value, "app_id", null)
          app_secret              = lookup(facebook.value, "app_secret", null)
          app_secret_setting_name = lookup(facebook.value, "app_secret_setting_name", null)
          oauth_scopes            = lookup(facebook.value, "oauth_scopes", null)
        }
      }

      dynamic "github" {
        for_each = lookup(auth_settings.value, "github", [])

        content {
          client_id                  = lookup(github.value, "client_id", null)
          client_secret              = lookup(github.value, "client_secret", null)
          client_secret_setting_name = lookup(github.value, "client_secret_setting_name", null)
          oauth_scopes               = lookup(github.value, "oauth_scopes", null)
        }
      }

      dynamic "google" {
        for_each = lookup(auth_settings.value, "google", [])

        content {
          client_id                  = lookup(google.value, "client_id", null)
          client_secret              = lookup(google.value, "client_secret", null)
          client_secret_setting_name = lookup(google.value, "client_secret_setting_name", null)
          oauth_scopes               = lookup(google.value, "oauth_scopes", null)
        }
      }

      dynamic "microsoft" {
        for_each = lookup(auth_settings.value, "microsoft", [])

        content {
          client_id                  = lookup(microsoft.value, "client_id", null)
          client_secret              = lookup(microsoft.value, "client_secret", null)
          client_secret_setting_name = lookup(microsoft.value, "client_secret_setting_name", null)
          oauth_scopes               = lookup(microsoft.value, "oauth_scopes", null)
        }
      }

      dynamic "twitter" {
        for_each = lookup(auth_settings.value, "twitter", [])

        content {
          consumer_key                 = lookup(twitter.value, "consumer_key", null)
          consumer_secret              = lookup(twitter.value, "consumer_secret", null)
          consumer_secret_setting_name = lookup(twitter.value, "consumer_secret_setting_name", null)
        }
      }
    }
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      app_settings["APPLICATIONINSIGHTS_CONNECTION_STRING"],
      site_config[0].application_insights_connection_string
    ]
  }
}

resource "azurerm_private_endpoint" "main" {
  name                = "${var.shared.naming.namingconstant}-pnpt-${var.shared.naming.loc}-fnap-sites"
  location            = var.shared.resg.location
  resource_group_name = var.shared.resg.name
  subnet_id           = var.pe_subnet_id
  tags                = var.tags

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.fnap_dns_zone]
  }

  private_service_connection {
    name                           = "${var.shared.naming.namingconstant}-pmpt-${var.shared.naming.loc}-${split("-", var.fnap_apsp_name)[4]}-sites-psc"
    private_connection_resource_id = azurerm_function_app_flex_consumption.main.id
    is_manual_connection           = false
    subresource_names              = ["sites"]
  }
}

resource "azurerm_monitor_diagnostic_setting" "main" {
  name                       = azurerm_function_app_flex_consumption.main.name
  target_resource_id         = azurerm_function_app_flex_consumption.main.id
  log_analytics_workspace_id = var.log_analytics_id

  enabled_log {
    category = "FunctionAppLogs"
  }
}
