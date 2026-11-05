variable "shared" {
  type = any

}

variable "cr_name" {
  type = string

}

variable "cr_sku" {
  type = string

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.cr_sku)
    error_message = "cr_sku must be Basic, Standard or Premium."
  }

}

variable "identity_ids" {
  type    = list(string)
  default = null

}

variable "georeplication_locations" {
  description = "One or more georeplications blocks"

  type = list(object({
    location                  = string
    regional_endpoint_enabled = bool
    zone_redundancy_enabled   = bool
  }))

  default = []

  validation {
    condition     = length(var.georeplication_locations) == 0 || var.cr_sku == "Premium"
    error_message = "Geo-replication requires cr_sku = \"Premium\"."
  }

}

variable "admin_enabled" {
  type    = bool
  default = false

}

variable "public_network_access_enabled" {
  type    = bool
  default = true

  validation {
    condition     = var.public_network_access_enabled || var.cr_sku == "Premium"
    error_message = "Disabling public network access requires cr_sku = \"Premium\"."
  }

}

variable "network_rule_bypass_option" {
  description = "AzureServices lets trusted services, including ACR Tasks (az acr build), through the firewall."
  type        = string
  default     = "AzureServices"

  validation {
    condition     = contains(["AzureServices", "None"], var.network_rule_bypass_option)
    error_message = "network_rule_bypass_option must be AzureServices or None."
  }

}

variable "allowed_ips" {
  description = "Public IPs or CIDRs allowed through the registry firewall (default action Deny)."
  type        = list(string)
  default     = []

  validation {
    condition     = length(var.allowed_ips) == 0 || var.cr_sku == "Premium"
    error_message = "Network rules (allowed_ips) require cr_sku = \"Premium\"."
  }

}

variable "data_endpoint_enabled" {
  type    = bool
  default = false

  validation {
    condition     = !var.data_endpoint_enabled || var.cr_sku == "Premium"
    error_message = "Dedicated data endpoints require cr_sku = \"Premium\"."
  }

}

variable "untagged_retention_days" {
  description = "Days before untagged manifests are deleted. null disables the retention policy."
  type        = number
  default     = null

  validation {
    condition     = var.untagged_retention_days == null || var.cr_sku == "Premium"
    error_message = "The retention policy requires cr_sku = \"Premium\"."
  }

}

variable "private_endpoint_enabled" {
  description = "Create the registry private endpoint (needs pe_subnet_id and cr_dns_zone_id)."
  type        = bool
  default     = false

  validation {
    condition     = !var.private_endpoint_enabled || var.cr_sku == "Premium"
    error_message = "Private endpoints require cr_sku = \"Premium\"."
  }

}

variable "pe_subnet_id" {
  description = "Subnet for the registry private endpoint. Required when private_endpoint_enabled is true."
  type        = string
  default     = null

  validation {
    condition     = !var.private_endpoint_enabled || var.pe_subnet_id != null
    error_message = "pe_subnet_id is required when private_endpoint_enabled is true."
  }

}

variable "cr_dns_zone_id" {
  description = "ID of the privatelink.azurecr.io zone. Required when private_endpoint_enabled is true."
  type        = string
  default     = null

  validation {
    condition     = !var.private_endpoint_enabled || var.cr_dns_zone_id != null
    error_message = "cr_dns_zone_id is required when private_endpoint_enabled is true."
  }

}

variable "log_analytics_id" {
  type = string

}

variable "tags" {
  type    = map(string)
  default = {}

}
