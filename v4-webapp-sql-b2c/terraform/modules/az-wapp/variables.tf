variable "shared" {
  type = any

}


variable "wapp_apsp_name" {
  description = "Name of app service plan"
  type        = string

}

variable "wapp_sku" {
  description = "SKU of the app service plan"
  type        = string
}

variable "wapp_os_type" {
  description = "OS type of app service plan : Windows, Linux, WindowsContainer "
  type        = string

}

variable "wapp_name" {
  description = "The name of the Web App."
  type        = string

}

variable "https_only" {
  description = "Should the Linux Web App require HTTPS connections"
  type        = bool
  default     = true

}

variable "client_affinity_enabled" {
  description = "Should Client Affinity be enabled?"
  type        = bool
  default     = false

}

variable "app_settings" {
  description = "Free-form key/value application settings for the web app (e.g. WEBSITE_RUN_FROM_PACKAGE, WEBSITES_PORT, APPLICATIONINSIGHTS_CONNECTION_STRING). Keys are arbitrary - there is no fixed schema."
  type        = map(string)
  default     = {}
}

variable "public_network_access_enabled" {
  description = "Enable public access to the web app"
  type        = bool

}

variable "site_config" {
  description = "Web app site_config. A list so the dynamic block iterates 0 or 1 times. Typed as objects (not maps) so attributes can hold mixed types and nested blocks without triggering inconsistent-type errors."
  type = list(object({
    always_on                                     = optional(bool, false)
    api_definition_url                            = optional(string)
    api_management_api_id                         = optional(string)
    app_command_line                              = optional(string)
    container_registry_managed_identity_client_id = optional(string)
    container_registry_use_managed_identity       = optional(bool, false)
    default_documents                             = optional(list(string))
    ftps_state                                    = optional(string, "Disabled")
    health_check_path                             = optional(string)
    health_check_eviction_time_in_min             = optional(number)
    http2_enabled                                 = optional(bool, false)
    ip_restriction_default_action                 = optional(string, "Allow")
    load_balancing_mode                           = optional(string, "LeastRequests")
    local_mysql_enabled                           = optional(bool, false)
    managed_pipeline_mode                         = optional(string, "Integrated")
    minimum_tls_version                           = optional(string, "1.2")
    remote_debugging_enabled                      = optional(bool, false)
    remote_debugging_version                      = optional(string)
    scm_ip_restriction_default_action             = optional(string, "Allow")
    scm_minimum_tls_version                       = optional(string, "1.2")
    scm_use_main_ip_restriction                   = optional(bool, false)
    use_32_bit_worker                             = optional(bool, false)
    vnet_route_all_enabled                        = optional(bool, false)
    websockets_enabled                            = optional(bool, false)
    worker_count                                  = optional(number)

    application_stack = optional(list(object({
      docker_image_name        = optional(string)
      docker_registry_url      = optional(string)
      docker_registry_username = optional(string)
      docker_registry_password = optional(string)
      dotnet_version           = optional(string)
      go_version               = optional(string)
      java_server              = optional(string)
      java_server_version      = optional(string)
      java_version             = optional(string)
      node_version             = optional(string)
      php_version              = optional(string)
      python_version           = optional(string)
      ruby_version             = optional(string)
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
  }))
  default = []
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

variable "log_analytics_id" {
  description = "Log analytics workspace for logs."
  type        = string

}

variable "wapp_subnet_id" {
  description = "Subnet ID for web app vnet integration."
  type        = string

}

variable "key_vault_id" {
  description = "ID of the key vault to pull web app certificate from"
  type = string
  default = null
  
}

variable "key_vault_reference_identity_id" {
  description = "Resource ID of the user-assigned identity App Service uses to pull Key Vault references (incl. the SSL cert)."
  type        = string
  default     = null
}

variable "identity_ids" {
  description = "List of managed identities."
  type        = list(string)
  default     = null

}

variable "pe_subnet_id" {
  description = "Subnet ID for web app private endpoint."
  type        = string
}

variable "wapp_dns_zone" {
  description = "DNS zone for the web app NIC."
  type        = string

}

variable "enable_custom_hostname" {
  description = "Assign a custom hostname to your web app."
  type        = bool
  default     = false

}

variable "hostname" {
  description = "The hostname to add to your app."
  type        = string
  default     = null

}

variable "certificate_key_vault_secret_id" {
  description = "Key vault ID for the certificate secret"
  type        = string
  default     = null

}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}

}


