locals {
  account_tier = (var.account_kind == "FilesTorage" ? "Premium" : split("_", var.sku_name)[0])

  account_replication_type = (local.account_tier == "Premium" ? "LRS" : split("_", var.sku_name)[1])
}

variable "shared" {
  type = any
}

variable "create_resource_group" {
  description = "whether to create resource group"
  type        = bool
  default     = false

}

variable "storage_account_name" {
  description = "Name of storage account"
  type        = string

}

variable "account_kind" {
  description = "Type of storage account"
  type        = string
  default     = "StorageV2"

}

variable "sku_name" {
  description = "Storage account sku"
  type        = string
  default     = "Standard_LRS"

}

variable "access_tier" {
  description = "Defines the access tier for the storage account"
  type        = string
  default     = "Hot"

}

variable "min_tls_version" {
  description = "Minimum supported tls version"
  type        = string
  default     = "TLS1_2"

}

variable "blob_soft_delete_retention_days" {
  description = "Number of days blobs should be retained"
  default     = 7

}

variable "container_soft_delete_retention_days" {
  description = "Number of days blobs should be retained"
  default     = 7

}

variable "enable_versioning" {
  description = "Is versioning enabled"
  type        = bool
  default     = false

}

variable "last_access_time_enabled" {
  description = "Is last access time based tracking enabled"
  type        = bool
  default     = false

}

variable "change_feed_enabled" {
  description = "Is blob change feed enabled"
  type        = bool
  default     = false
}

variable "enable_advanced_threat_protection" {
  description = "Is advanced threat protection enabled"
  type        = bool
  default     = false

}

variable "network_rules" {
  description = "Network rules restricting access to storage account"
  type = object({
    bypass     = list(string),
    ip_rules   = list(string),
    subnet_ids = list(string),
  })

  default = null

}

variable "containers_list" {
  description = "List of containers to create and their access tiers"
  type = list(object({
    name        = string,
    access_type = string
  }))
  default = []
}

variable "file_shares" {
  description = "List of file shares to create"
  type = list(object({
    name  = string,
    quota = number
  }))

  default = []
}

variable "queues" {
  description = "List of storage queues"
  type        = list(string)

  default = []
}

variable "tables" {
  description = "List of storage tables"
  type        = list(string)

  default = []
}

variable "lifecycles" {
  description = "Storage account lifecycle management"
  type = list(object({
    prefix_match               = set(string),
    tier_to_cool_after_days    = number,
    tier_to_archive_after_days = number,
    delete_after_days          = number,
    snapshot_delete_after_days = number
  }))

  default = []
}

variable "identity_ids" {
  description = "List of user managed identities to be assigned"
  default     = null

}

variable "tags" {
  description = "resource tags"
  type        = map(string)

  default = {}

}

variable "static_website" {
  description = "static website"
  type        = map(string)

  default = {}

}

variable "is_hns_enabled" {
  description = "Is hierarchical namespace enabled (Data Lake Den2)"
  type        = bool
  default     = false

}

variable "stra_network_rules_enabled" {
  description = "network rules enabled"
  type        = bool
  default     = false

}

variable "stra_network_rules_enabled_cross_region" {
  description = "Network rules for selected networks - cross region"
  type        = bool
  default     = false

}

variable "bypass_allowed_azure_services" {
  description = "Allow trusted Azure services to access storage account"
  type        = list(string)
  default     = ["AzureServices"]

}

variable "blob_cors" {
  description = "blob cors rules"
  type = map(object({
    allowed_headers    = list(string)
    allowed_methods    = list(string)
    allowed_origins    = list(string)
    exposed_headers    = list(string)
    max_age_in_seconds = number
  }))
  default = null

}

variable "queue_cors" {
  description = "queue cors rules"
  type = map(object({
    allowed_headers    = list(string)
    allowed_methods    = list(string)
    allowed_origins    = list(string)
    exposed_headers    = list(string)
    max_age_in_seconds = number
  }))
  default = null

}

variable "table_cors" {
  description = "table cors rules"
  type = map(object({
    allowed_headers    = list(string)
    allowed_methods    = list(string)
    allowed_origins    = list(string)
    exposed_headers    = list(string)
    max_age_in_seconds = number
  }))
  default = null

}

variable "file_cors" {
  description = "file cors rules"
  type = map(object({
    allowed_headers    = list(string)
    allowed_methods    = list(string)
    allowed_origins    = list(string)
    exposed_headers    = list(string)
    max_age_in_seconds = number
  }))
  default = null

}

variable "enable_cross_region_private_endpoint" {
  description = "Is cross region private endpoint enabled"
  type        = bool
  default     = false

}

variable "sftp_enabled" {
  description = "Is sftp enabled"
  type        = bool
  default     = false

}

variable "https_traffic_only_enabled" {
  description = "Is https only traffic enabled"
  type        = bool
  default     = true

}

variable "pe_subnet_id" {
  description = "Private endpoint subnet ID."
  type        = string

}

variable "pe_subnet_id_ukw" {
  description = "UK West private endpoint subnet ID."
  type        = string
  default     = null

}

variable "blob_dns_zone" {
  description = "DNS zone for blob endpoint"
  type        = string
  default     = null

}

variable "file_dns_zone" {
  description = "DNS zone for file endpoint"
  type        = string
  default     = null

}

variable "queue_dns_zone" {
  description = "DNS zone for queue endpoint"
  type        = string
  default     = null

}

variable "table_dns_zone" {
  description = "DNS zone for table endpoint"
  type        = string
  default     = null

}


variable "web_dns_zone" {
  description = "DNS zone for web endpoint"
  type        = string
  default     = null

}

variable "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID for diagnostic logs."
  type        = string

}

variable "is_used_for_lgaps" {
  description = "Enable queue private endpoint to allow Logic App Standard to connect"
  type        = bool

}



