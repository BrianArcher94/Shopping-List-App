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
    name     = string              # Standard_Small, Standard_Medium, Standard_Large, Standard_v2, WAF_Medium, WAF_Large, and WAF_v2
    tier     = string              # Standard, Standard_v2, WAF and WAF_v2
    capacity = optional(number, 2) # V1 SKU this value must be between 1 and 32, and 1 to 125 for a V2 SKU
  })
  default = {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 1
  }
  description = <<-DESCRIPTION
 - `name` - (Required) The Name of the SKU to use for this Application Gateway. Possible values are `Standard_v2` and `WAF_v2`.
 - `tier` - (Required) The Tier of the SKU to use for this Application Gateway. Possible values are `Standard_v2` and `WAF_v2`.
 - `capacity` - (Optional) The Capacity of the SKU to use for this Application Gateway. When using a V2 SKU this value must be between `1` and `125`. This property is optional if `autoscale_configuration` is set.
DESCRIPTION
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
  description = <<-DESCRIPTION
 - `data` - (Optional) The contents of the Trusted Root Certificate which should be used. Required if `key_vault_secret_id` is not set.
 - `key_vault_secret_id` - (Optional) The Secret ID of (base-64 encoded unencrypted pfx) `Secret` or `Certificate` object stored in Azure KeyVault. You need to enable soft delete for the Key Vault to use this feature. Required if `data` is not set.
 - `name` - (Required) The Name of the Trusted Root Certificate to use.
DESCRIPTION
}

variable "ssl_certificates" {
  type = map(object({
    name                = string
    data                = optional(string)
    password            = optional(string)
    key_vault_secret_id = optional(string)
  }))
  default     = null
  description = <<-DESCRIPTION
 - `data` - (Optional) The base64-encoded PFX certificate data. Required if `key_vault_secret_id` is not set.
 - `key_vault_secret_id` - (Optional) The Secret ID of (base-64 encoded unencrypted pfx) the `Secret` or `Certificate` object stored in Azure KeyVault. You need to enable soft delete for Key Vault to use this feature. Required if `data` is not set.
 - `name` - (Required) The Name of the SSL certificate that is unique within this Application Gateway
 - `password` - (Optional) Password for the pfx file specified in data. Required if `data` is set.
DESCRIPTION
}

variable "backend_address_pools" {
  type = map(object({
    name         = string
    fqdns        = optional(set(string))
    ip_addresses = optional(set(string))
  }))
  description = <<-DESCRIPTION
 - `name` - (Required) The name of the Backend Address Pool.
 - `fqdns` - (Optional) A list of FQDN's which should be part of the Backend Address Pool.
 - `ip_addresses` - (Optional) A list of IP Addresses which should be part of the Backend Address Pool.
DESCRIPTION
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
  description = <<-DESCRIPTION
 - `host` - (Optional) The Hostname used for this Probe. If the Application Gateway is configured for a single site, by default the Host name should be specified as `127.0.0.1`, unless otherwise configured in custom probe. Cannot be set if `pick_host_name_from_backend_http_settings` is set to `true`.
 - `interval` - (Required) The Interval between two consecutive probes in seconds. Possible values range from 1 second to a maximum of 86,400 seconds.
 - `minimum_servers` - (Optional) The minimum number of servers that are always marked as healthy. Defaults to `0`.
 - `name` - (Required) The Name of the Probe.
 - `path` - (Required) The Path used for this Probe.
 - `pick_host_name_from_backend_http_settings` - (Optional) Whether the host header should be picked from the backend HTTP settings. Defaults to `false`.
 - `port` - (Optional) Custom port which will be used for probing the backend servers. The valid value ranges from 1 to 65535. In case not set, port from HTTP settings will be used. This property is valid for Standard_v2 and WAF_v2 only.
 - `protocol` - (Required) The Protocol used for this Probe. Possible values are `Http` and `Https`.
 - `timeout` - (Required) The Timeout used for this Probe, which indicates when a probe becomes unhealthy. Possible values range from 1 second to a maximum of 86,400 seconds.
 - `unhealthy_threshold` - (Required) The Unhealthy Threshold for this Probe, which indicates the amount of retries which should be attempted before a node is deemed unhealthy. Possible values are from 1 to 20.

 ---
 `match` block supports the following:
 - `body` - (Optional) A snippet from the Response Body which must be present in the Response.
 - `status_code` - (Required) A list of allowed status codes for this Health Probe.
DESCRIPTION
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
  description = <<-DESCRIPTION
 - `cookie_based_affinity` - (Required) Is Cookie-Based Affinity enabled? Possible values are `Enabled` and `Disabled`.
 - `dedicated_backend_connection_enabled` - (Optional) Whether to use a dedicated backend connection. Defaults to `false`.
 - `name` - (Required) The name of the Backend HTTP Settings Collection.
 - `port` - (Required) The port which should be used for this Backend HTTP Settings Collection.
 - `protocol` - (Required) The Protocol which should be used. Possible values are `Http` and `Https`.
 - `affinity_cookie_name` - (Optional) The name of the affinity cookie.
 - `host_name` - (Optional) Host header to be sent to the backend servers. Cannot be set if `pick_host_name_from_backend_address` is set to `true`.
 - `path` - (Optional) The Path which should be used as a prefix for all HTTP requests.
 - `pick_host_name_from_backend_address` - (Optional) Whether host header should be picked from the host name of the backend server. Defaults to `false`.
 - `probe_name` - (Optional) The name of an associated HTTP Probe.
 - `request_timeout` - (Optional) The request timeout in seconds, which must be between 1 and 86400 seconds. Defaults to `30`.
 - `trusted_root_certificate_names` - (Optional) A list of `trusted_root_certificate` names.

 ---
 `authentication_certificate` block supports the following:
 - `name` - (Required) The Name of the Authentication Certificate to use.

 ---
 `connection_draining` block supports the following:
 - `drain_timeout_sec` - (Required) The number of seconds connection draining is active. Acceptable values are from `1` second to `3600` seconds.
 - `enable_connection_draining` - (Required) If connection draining is enabled or not.
DESCRIPTION
  nullable    = false

  validation {
    # create a condition that checks host_name is null if pick_host_name_from_backend_address is set to true
    condition     = alltrue([for _, v in var.backend_http_settings : v.pick_host_name_from_backend_address == true ? v.host_name == null : true])
    error_message = "host_name must not be set if pick_host_name_from_backend_address is set to true."
  }
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
  description = <<-DESCRIPTION
 - `firewall_policy_id` - (Optional) The ID of the Web Application Firewall Policy which should be used for this HTTP Listener.
 - `frontend_ip_configuration_name` - (Required) The Name of the Frontend IP Configuration used for this HTTP Listener.
 - `frontend_port_name` - (Required) The Name of the Frontend Port use for this HTTP Listener.
 - `host_name` - (Optional) The Hostname which should be used for this HTTP Listener. Setting this value changes Listener Type to 'Multi site'.
 - `host_names` - (Optional) A list of Hostname(s) should be used for this HTTP Listener. It allows special wildcard characters.
 - `name` - (Required) The Name of the HTTP Listener.
 - `require_sni` - (Optional) Should Server Name Indication be Required? Defaults to `false`.
 - `ssl_certificate_name` - (Optional) The name of the associated SSL Certificate which should be used for this HTTP Listener.
 - `ssl_profile_name` - (Optional) The name of the associated SSL Profile which should be used for this HTTP Listener.

 ---
 `custom_error_configuration` block supports the following:
 - `custom_error_page_url` - (Required) Error page URL of the application gateway customer error.
 - `status_code` - (Required) Status code of the application gateway customer error. Possible values are `HttpStatus403` and `HttpStatus502`
DESCRIPTION
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
  description = <<-DESCRIPTION
 - `include_path` - (Optional) Whether to include the path in the redirected URL. Defaults to `false`
 - `include_query_string` - (Optional) Whether to include the query string in the redirected URL. Default to `false`
 - `name` - (Required) Unique name of the redirect configuration block
 - `redirect_type` - (Required) The type of redirect. Possible values are `Permanent`, `Temporary`, `Found` and `SeeOther`
 - `target_listener_name` - (Optional) The name of the listener to redirect to. Cannot be set if `target_url` is set.
 - `target_url` - (Optional) The URL to redirect the request to. Cannot be set if `target_listener_name` is set.
DESCRIPTION
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
  description = <<-DESCRIPTION
 - `backend_address_pool_name` - (Required) The Name of the Backend Address Pool which should be used for this Routing Rule. Cannot be set if `redirect_configuration_name` is set.
 - `backend_http_settings_name` - (Required) The Name of the Backend HTTP Settings Collection which should be used for this Routing Rule. Cannot be set if `redirect_configuration_name` is set.
 - `http_listener_name` - (Required) The Name of the HTTP Listener which should be used for this Routing Rule.
 - `name` - (Required) The Name of this Request Routing Rule.
 - `priority` - (Required) Rule evaluation order can be dictated by specifying an integer value from `1` to `20000` with `1` being the highest priority and `20000` being the lowest priority.
 - `redirect_configuration_name` - (Optional) The Name of the Redirect Configuration which should be used for this Routing Rule. Cannot be set if either `backend_address_pool_name` or `backend_http_settings_name` is set.
 - `rewrite_rule_set_name` - (Optional) The Name of the Rewrite Rule Set which should be used for this Routing Rule. Only valid for v2 SKUs.
 - `rule_type` - (Required) The Type of Routing that should be used for this Rule. Possible values are `Basic` and `PathBasedRouting`.
 - `url_path_map_name` - (Optional) The Name of the URL Path Map which should be associated with this Routing Rule.
DESCRIPTION
  nullable    = false
}

variable "log_analytics_id" {
  
}

variable "tags" {
  description = "Map of tags for resources"
  type        = map(string)
  default     = {}

}
