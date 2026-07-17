variable "shared" {
  type = any

}

variable "pip_name" {
  description = "Name for appgw public ip address"
  type        = string

}

variable "pip_allocation_method" {
  description = "Defines the allocation method for this IP address. Possible values are Static or Dynamic"
  type        = string


}

variable "pip_sku" {
  description = "The SKU of the Public IP. Possible values are Basic, Standard, and StandardV2. Defaults to Standard"
  type        = string

}

variable "appgw_name" {
  description = "Name of the app gateway resource"
  type        = string

}

variable "identity_ids" {
  description = "A list of managed identity IDs"
  type        = list(string)
  default     = null

}

variable "appgw_sku" {
  type = object({
    name     = string         
    tier     = string             
    capacity = optional(number, 2) 
  })
  default = {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 1
  }

}

variable "gateway_ip_configuration" {
  description = "Gateway IP config"
  type = object({
    name      = string
    subnet_id = string
  })

}

variable "frontend_ip_configuration_private" {
  description = "IP config of internal frontend"
  type = object({
    name                            = optional(string)
    private_ip_address              = optional(string)
    private_ip_address_allocation   = optional(string)
    private_link_configuration_name = optional(string)
    subnet_id                       = optional(string)
  })
  default = {}

}

variable "frontend_ip_configuration_public" {
  description = "IP config of public frontend"
  type = object({
    name                 = string
    public_ip_address_id = optional(string)
  })
  default = {
    name = "public"
  }


}

variable "frontend_port" {
  description = "App gateway frontend ports"
  type = map(object({
    name = string
    port = number
  }))

}

variable "trusted_root_certificate" {
  type = map(object({
    data                = optional(string)
    key_vault_secret_id = optional(string)
    name                = string
  }))
  default     = null
}

variable "ssl_certificates" {
  type = map(object({
    name                = string
    data                = optional(string)
    password            = optional(string)
    key_vault_secret_id = optional(string)
  }))
  default     = null
}

variable "backend_address_pools" {
  type = map(object({
    name         = string
    fqdns        = optional(set(string))
    ip_addresses = optional(set(string))
  }))
}

variable "probe_configurations" {
  type = map(object({
    name                                      = string
    host                                      = optional(string)
    interval                                  = number
    timeout                                   = number
    unhealthy_threshold                       = number
    protocol                                  = string
    port                                      = optional(number)
    path                                      = string
    pick_host_name_from_backend_http_settings = optional(bool)
    minimum_servers                           = optional(number)
    match = optional(object({
      body        = optional(string)
      status_code = optional(list(string))
    }))
  }))
  default     = null
}

variable "backend_http_settings" {
  type = map(object({
    cookie_based_affinity                = optional(string, "Disabled")
    dedicated_backend_connection_enabled = optional(bool, false)
    name                                 = string
    port                                 = number
    protocol                             = string
    affinity_cookie_name                 = optional(string)
    host_name                            = optional(string)
    path                                 = optional(string)
    pick_host_name_from_backend_address  = optional(bool)
    probe_name                           = optional(string)
    request_timeout                      = optional(number)
    trusted_root_certificate_names       = optional(list(string))
    authentication_certificate = optional(list(object({
      name = string
    })))
    connection_draining = optional(object({
      drain_timeout_sec          = number
      enable_connection_draining = bool
    }))
  }))
  nullable    = false
}

variable "http_listeners" {
  type = map(object({
    name                           = string
    frontend_port_name             = string
    protocol                       = string
    frontend_ip_configuration_name = optional(string)
    firewall_policy_id             = optional(string)
    require_sni                    = optional(bool)
    host_name                      = optional(string)
    host_names                     = optional(list(string))
    ssl_certificate_name           = optional(string)
    ssl_profile_name               = optional(string)
    custom_error_configuration = optional(list(object({
      status_code           = string
      custom_error_page_url = string
    })))
    # Define other attributes as needed
  }))
  nullable    = false
}

variable "redirect_configuration" {
  type = map(object({
    include_path         = optional(bool)
    include_query_string = optional(bool)
    name                 = string
    redirect_type        = string
    target_listener_name = optional(string)
    target_url           = optional(string)
  }))
  default     = null
}

variable "request_routing_rules" {
  type = map(object({
    name                        = string
    rule_type                   = string
    http_listener_name          = string
    backend_address_pool_name   = optional(string)
    priority                    = number
    url_path_map_name           = optional(string)
    backend_http_settings_name  = optional(string)
    redirect_configuration_name = optional(string)
    rewrite_rule_set_name       = optional(string)
    # Define other attributes as needed
  }))
  nullable    = false
}

variable "log_analytics_id" {
  description = "Log analytics workspace ID."
  type = string
  
}

variable "tags" {
  description = "Map of tags for resources"
  type        = map(string)
  default     = {}

}
