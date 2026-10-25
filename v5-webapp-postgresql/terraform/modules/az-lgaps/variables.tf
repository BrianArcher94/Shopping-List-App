variable "shared" {
  description = "Shared object (resource group, naming, tags, etc.) passed from the root module."
  type        = any
}

# ---------------------------------------------------------------------------
# Service plan (Workflow Standard)
# ---------------------------------------------------------------------------

variable "lgaps_apsp_name" {
  description = "The name of the Logic App (Workflow Standard) service plan."
  type        = string
}

variable "lgaps_sku" {
  description = "The SKU for the Logic App service plan. Workflow Standard tiers: WS1, WS2, WS3."
  type        = string
}

variable "lgaps_os_type" {
  description = "The OS type for the Logic App service plan (Windows or Linux)."
  type        = string
}

# ---------------------------------------------------------------------------
# Logic App Standard
# ---------------------------------------------------------------------------

variable "lgaps_name" {
  description = "The name of the Logic App Standard."
  type        = string
}

variable "storage_account_name" {
  description = "Name of the backing storage account (created in a separate module)."
  type        = string
}

variable "storage_account_access_key" {
  description = "Access key of the backing storage account (from the storage module output)."
  type        = string
  sensitive   = true
}

variable "storage_account_share_name" {
  description = "Optional file share name used by the Logic App content. Null lets Azure manage it."
  type        = string
  default     = null
}

variable "app_settings" {
  description = "Free-form key/value application settings for the Logic App. Keys are arbitrary - there is no fixed schema."
  type        = map(string)
  default     = {}
}

variable "use_extension_bundle" {
  description = "Should the Logic App use the bundled extension package. Defaults to true."
  type        = bool
  default     = true
}

variable "bundle_version" {
  description = "If use_extension_bundle is true, the version range of the extension bundle."
  type        = string
  default     = "[1.*, 2.0.0)"
}

variable "client_affinity_enabled" {
  description = "Should client affinity be enabled."
  type        = bool
  default     = false
}

variable "client_certificate_mode" {
  description = "The mode of client certificates (Required, Optional, OptionalInteractiveUser)."
  type        = string
  default     = null
}

variable "enabled" {
  description = "Is the Logic App enabled."
  type        = bool
  default     = true
}

variable "ftp_publish_basic_authentication_enabled" {
  description = "Should basic authentication be enabled for FTP publishing."
  type        = bool
  default     = false
}

variable "scm_publish_basic_authentication_enabled" {
  description = "Should basic authentication be enabled for SCM publishing."
  type        = bool
  default     = false
}

variable "https_only" {
  description = "Should the Logic App only be accessible over HTTPS."
  type        = bool
  default     = true
}

variable "public_network_access" {
  description = "Public network access for the Logic App (Enabled or Disabled)."
  type        = string
  default     = "Disabled"
}

variable "logic_app_version" {
  description = "The runtime version of the Logic App (maps to the `version` argument, e.g. ~4)."
  type        = string
  default     = "~4"
}

variable "virtual_network_subnet_id" {
  description = "Subnet ID for the Logic App regional VNet integration."
  type        = string
  default     = null
}

variable "vnet_content_share_enabled" {
  description = "Should the Logic App content share be served over the VNet."
  type        = bool
  default     = false
}

variable "identity_ids" {
  description = "User-assigned managed identity IDs to attach. Null = system-assigned only."
  type        = list(string)
  default     = null
}

variable "connection_strings" {
  description = "Connection strings for the Logic App."
  type = list(object({
    name  = string
    type  = string
    value = string
  }))
  default = []
}

variable "site_config" {
  description = "Logic App Standard site_config. A list so the dynamic block iterates at least once. Typed as objects so attributes can hold mixed types and nested blocks without triggering inconsistent-type errors."
  type = list(object({
    always_on                         = optional(bool, false)
    app_scale_limit                   = optional(number)
    auto_swap_slot_name               = optional(string)
    dotnet_framework_version          = optional(string)
    elastic_instance_minimum          = optional(number)
    ftps_state                        = optional(string, "Disabled")
    health_check_path                 = optional(string)
    http2_enabled                     = optional(bool, false)
    ip_restriction_default_action     = optional(string, "Allow")
    scm_ip_restriction_default_action = optional(string, "Allow")
    scm_use_main_ip_restriction       = optional(bool, false)
    scm_min_tls_version               = optional(string, "1.2")
    scm_type                          = optional(string)
    linux_fx_version                  = optional(string)
    min_tls_version                   = optional(string, "1.2")
    pre_warmed_instance_count         = optional(number)
    runtime_scale_monitoring_enabled  = optional(bool)
    use_32_bit_worker_process         = optional(bool, false)
    vnet_route_all_enabled            = optional(bool, false)
    websockets_enabled                = optional(bool, false)

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
  default = [{}]
}

# ---------------------------------------------------------------------------
# Private endpoint and diagnostics
# ---------------------------------------------------------------------------

variable "pe_subnet_id" {
  description = "Subnet ID for the Logic App private endpoint."
  type        = string
}

variable "lgaps_dns_zone" {
  description = "Private DNS zone ID for the Logic App NIC (privatelink.azurewebsites.net)."
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
