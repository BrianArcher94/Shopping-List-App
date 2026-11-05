variable "fnap_apsp_name" {
  description = "The name of the function app service plan."
  type        = string

}

variable "fnap_sku" {
  description = "The SKU for the function app service plan"
  type        = string

}

variable "fnap_os_type" {
  description = "The OS for the function app service plan"
  type        = string

}

variable "fnap_name" {
  description = "The name for the function app"
  type        = string

}

variable "storage_container_type" {
  description = "Container type for function app storage"
  type        = string

}

variable "storage_container_endpoint" {
  description = "Container endpoint for function storage"
  type        = string
}

variable "storage_authentication_type" {
  description = "Authentication to connect function app to storage account"
  type        = string

}

variable "storage_user_assigned_identity_id" {
  description = "UAMI to connect function app to storage account"
  type        = string

}

variable "runtime_name" {
  description = "Function app runtime. Possible values are; node, dotnet-isolated, powershell, python, java and custom"
  type        = string

}

variable "runtime_version" {
  description = "Runtime version of function app"
  type        = string

}

variable "max_instance_count" {
  description = " The number of workers this function app can scale out to. The supported value are from 1 to 1000"
  type        = number
  default     = 1

}

variable "instance_memory_in_mb" {
  description = "The memory size of the instances on which your app runs."
  type        = number
  default     = 2048

}

variable "virtual_network_subnet_id" {
  description = "Subnet ID for function app vnet integration"
  type        = string

}

variable "identity_ids" {
  description = "A list of managed identity IDs"
  type        = list(string)
  default     = null

}

variable "shared" {
  description = "Shared object (resource group, naming, tags, etc.) passed from the root module."
  type        = any
}

variable "https_only" {
  description = "Should the Function App only be accessible over HTTPS."
  type        = bool
  default     = true
}

variable "app_settings" {
  description = "Free-form key/value application settings for the Function App (e.g. AzureWebJobsStorage__accountName, APPLICATIONINSIGHTS_CONNECTION_STRING). Keys are arbitrary - there is no fixed schema."
  type        = map(string)
  default     = {}
}

variable "public_network_access_enabled" {
  description = "Enable public access to the function app."
  type        = bool

}

variable "site_config" {
  description = "Function App Flex Consumption site_config. A list so the dynamic block iterates at least once (site_config is required). Typed as objects so attributes can hold mixed types and nested blocks without triggering inconsistent-type errors."
  type = list(object({
    api_definition_url                            = optional(string)
    api_management_api_id                         = optional(string)
    app_command_line                              = optional(string)
    application_insights_connection_string        = optional(string)
    application_insights_key                      = optional(string)
    container_registry_managed_identity_client_id = optional(string)
    container_registry_use_managed_identity       = optional(bool, false)
    default_documents                             = optional(list(string))
    health_check_path                             = optional(string)
    health_check_eviction_time_in_min             = optional(number)
    http2_enabled                                 = optional(bool, false)
    ip_restriction_default_action                 = optional(string, "Allow")
    load_balancing_mode                           = optional(string, "LeastRequests")
    managed_pipeline_mode                         = optional(string, "Integrated")
    minimum_tls_version                           = optional(string, "1.2")
    remote_debugging_enabled                      = optional(bool, false)
    remote_debugging_version                      = optional(string)
    runtime_scale_monitoring_enabled              = optional(bool)
    scm_ip_restriction_default_action             = optional(string, "Allow")
    scm_minimum_tls_version                       = optional(string, "1.2")
    scm_use_main_ip_restriction                   = optional(bool, false)
    use_32_bit_worker                             = optional(bool, false)
    vnet_route_all_enabled                        = optional(bool, false)
    websockets_enabled                            = optional(bool, false)
    worker_count                                  = optional(number)

    app_service_logs = optional(list(object({
      disk_quota_mb         = optional(number, 35)
      retention_period_days = optional(number)
    })), [])

    cors = optional(list(object({
      allowed_origins     = optional(list(string))
      support_credentials = optional(bool, false)
    })), [])

    ip_restriction = optional(list(object({
      action                    = optional(string, "Allow")
      ip_address                = optional(string)
      name                      = optional(string)
      priority                  = optional(number, 65000)
      service_tag               = optional(string)
      virtual_network_subnet_id = optional(string)
      description               = optional(string)
      headers = optional(list(object({
        x_azure_fdid      = optional(list(string))
        x_fd_health_probe = optional(list(string))
        x_forwarded_for   = optional(list(string))
        x_forwarded_host  = optional(list(string))
      })), [])
    })), [])

    scm_ip_restriction = optional(list(object({
      action                    = optional(string, "Allow")
      ip_address                = optional(string)
      name                      = optional(string)
      priority                  = optional(number, 65000)
      service_tag               = optional(string)
      virtual_network_subnet_id = optional(string)
      description               = optional(string)
      headers = optional(list(object({
        x_azure_fdid      = optional(list(string))
        x_fd_health_probe = optional(list(string))
        x_forwarded_for   = optional(list(string))
        x_forwarded_host  = optional(list(string))
      })), [])
    })), [])
  }))
  # site_config is a required block on the resource, so default to a single
  # empty object to guarantee one (empty) site_config block is rendered.
  default = [{}]
}

variable "auth_settings" {
  description = "Built-in authentication (EasyAuth v1) configuration. A list so the dynamic block iterates 0 or 1 times."
  type = list(object({
    enabled                        = optional(bool, false)
    additional_login_parameters    = optional(map(string))
    allowed_external_redirect_urls = optional(list(string))
    default_provider               = optional(string)
    issuer                         = optional(string)
    runtime_version                = optional(string)
    token_refresh_extension_hours  = optional(number, 72)
    token_store_enabled            = optional(bool, false)
    unauthenticated_client_action  = optional(string)

    active_directory = optional(list(object({
      client_id                  = optional(string)
      client_secret              = optional(string)
      client_secret_setting_name = optional(string)
      allowed_audiences          = optional(list(string))
    })), [])

    facebook = optional(list(object({
      app_id                  = optional(string)
      app_secret              = optional(string)
      app_secret_setting_name = optional(string)
      oauth_scopes            = optional(list(string))
    })), [])

    github = optional(list(object({
      client_id                  = optional(string)
      client_secret              = optional(string)
      client_secret_setting_name = optional(string)
      oauth_scopes               = optional(list(string))
    })), [])

    google = optional(list(object({
      client_id                  = optional(string)
      client_secret              = optional(string)
      client_secret_setting_name = optional(string)
      oauth_scopes               = optional(list(string))
    })), [])

    microsoft = optional(list(object({
      client_id                  = optional(string)
      client_secret              = optional(string)
      client_secret_setting_name = optional(string)
      oauth_scopes               = optional(list(string))
    })), [])

    twitter = optional(list(object({
      consumer_key                 = optional(string)
      consumer_secret              = optional(string)
      consumer_secret_setting_name = optional(string)
    })), [])
  }))
  default = []
}

variable "pe_subnet_id" {
  description = "Subnet ID for the Function App private endpoint."
  type        = string
}

variable "fnap_dns_zone" {
  description = "Private DNS zone ID for the Function App NIC (privatelink.azurewebsites.net)."
  type        = string
}

variable "log_analytics_id" {
  description = "Log Analytics workspace ID for diagnostic settings."
  type        = string
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}