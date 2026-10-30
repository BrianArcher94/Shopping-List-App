variable "shared" {
  type = any

}

####################################################################################################
# Account
####################################################################################################

variable "cosmos_account_name" {
  type        = string
  description = "Name of the Cosmos DB account (globally unique; 3-44 chars, lower case letters, numbers and hyphens)."

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$", var.cosmos_account_name))
    error_message = "cosmos_account_name must be 3-44 characters of lower case letters, numbers and hyphens, and must not start or end with a hyphen."
  }

}

variable "offer_type" {
  type        = string
  description = "Cosmos DB offer type. Standard is the only supported value."
  default     = "Standard"

}

variable "kind" {
  type        = string
  description = "Cosmos DB API kind. GlobalDocumentDB = NoSQL API."
  default     = "GlobalDocumentDB"

  validation {
    condition     = contains(["GlobalDocumentDB", "MongoDB", "Parse"], var.kind)
    error_message = "kind must be one of: GlobalDocumentDB, MongoDB, Parse."
  }

}

variable "capabilities" {
  type        = list(string)
  description = "Account capabilities, e.g. EnableServerless. Removing EnableServerless later is not an in-place change."
  default     = ["EnableServerless"]

}

variable "consistency_policy" {
  type = object({
    consistency_level       = string
    max_interval_in_seconds = optional(number)
    max_staleness_prefix    = optional(number)
  })
  description = "Default consistency. The max_* values only apply to BoundedStaleness."
  default = {
    consistency_level = "Session"
  }

  validation {
    condition     = contains(["Strong", "BoundedStaleness", "Session", "ConsistentPrefix", "Eventual"], var.consistency_policy.consistency_level)
    error_message = "consistency_level must be one of: Strong, BoundedStaleness, Session, ConsistentPrefix, Eventual."
  }

}

variable "geo_locations" {
  type = list(object({
    location          = string
    failover_priority = number
    zone_redundant    = optional(bool, false)
  }))
  description = "Account regions. Empty = a single region in the resource group's location. Serverless supports one region only."
  default     = []

  validation {
    condition     = length(var.geo_locations) == 0 || contains([for g in var.geo_locations : g.failover_priority], 0)
    error_message = "One geo_location must have failover_priority = 0 (the write region)."
  }

}

variable "backup" {
  type = object({
    type                = string
    tier                = optional(string)
    interval_in_minutes = optional(number)
    retention_in_hours  = optional(number)
    storage_redundancy  = optional(string)
  })
  description = "Backup policy. Continuous (tier Continuous7Days/Continuous30Days) or Periodic (interval/retention/redundancy). Continuous cannot be switched back to Periodic. Null = Azure default (Periodic)."
  default = {
    type = "Continuous"
    tier = "Continuous7Days"
  }

  validation {
    condition     = var.backup == null || contains(["Continuous", "Periodic"], try(var.backup.type, ""))
    error_message = "backup.type must be Continuous or Periodic."
  }

}

variable "identity" {
  type = object({
    type         = string
    identity_ids = optional(list(string))
  })
  description = "Optional managed identity for the account itself (CMK/outbound features only). Null = no identity block."
  default     = null

}

variable "tags" {
  description = "resource tags"
  type        = map(string)

  default = {}

}

####################################################################################################
# Security & networking
####################################################################################################

variable "local_authentication_disabled" {
  type        = bool
  description = "Disable key-based (local) auth so only Entra ID data-plane RBAC works."
  default     = true

}

variable "access_key_metadata_writes_enabled" {
  type        = bool
  description = "Allow control-plane metadata writes using account keys."
  default     = false

}

variable "public_network_access_enabled" {
  type        = bool
  description = "Public endpoint enabled. Keep false in steady state; time-boxed dev access only."
  default     = false

}

variable "ip_range_filter" {
  type        = set(string)
  description = "IPs / CIDRs allowed through the public endpoint (only meaningful while public access is enabled)."
  default     = []

}

variable "network_acl_bypass_for_azure_services" {
  type        = bool
  description = "Let trusted Azure services bypass the network ACL."
  default     = false

}

variable "minimal_tls_version" {
  type        = string
  description = "Minimum TLS version accepted by the account."
  default     = "Tls12"

  validation {
    condition     = contains(["Tls", "Tls11", "Tls12"], var.minimal_tls_version)
    error_message = "minimal_tls_version must be one of: Tls, Tls11, Tls12."
  }

}

variable "pe_subnet_id" {
  type        = string
  description = "ID of private endpoint subnet."

}

variable "cosmos_dns_zone" {
  type        = string
  description = "ID of the privatelink.documents.azure.com private DNS zone."

}

####################################################################################################
# Database & containers
####################################################################################################

variable "database_name" {
  type        = string
  description = "Name of the SQL (NoSQL API) database."

}

variable "containers" {
  type = map(object({
    partition_key_paths   = list(string)
    partition_key_kind    = optional(string, "Hash")
    partition_key_version = optional(number, 2)
    default_ttl           = optional(number)
    indexing_mode         = optional(string, "consistent")
    included_paths        = optional(list(string), ["/*"])
    excluded_paths        = optional(list(string), [])
    composite_indexes = optional(list(list(object({
      path  = string
      order = optional(string, "ascending")
    }))), [])
    unique_keys = optional(list(list(string)), [])
  }))
  description = <<-EOT
    Containers keyed by name. Partition key paths/kind/version and unique keys are fixed at creation —
    changing them replaces the container and deletes its data. Indexing changes are in-place.
      partition_key_paths : one path ("Hash") or up to three for hierarchical keys ("MultiHash")
      included_paths      : e.g. ["/weekStartDate/?"]; defaults to everything ("/*")
      excluded_paths      : e.g. ["/*"] to index only the included paths
      composite_indexes   : list of indexes, each a list of { path, order } (2+ paths)
      unique_keys         : list of keys, each a list of paths
  EOT
  default     = {}

  validation {
    condition = alltrue(flatten([
      for c in values(var.containers) : [for p in c.partition_key_paths : startswith(p, "/")]
    ]))
    error_message = "Every partition key path must start with \"/\"."
  }

  validation {
    condition = alltrue([
      for c in values(var.containers) :
      (length(c.partition_key_paths) == 1 && c.partition_key_kind == "Hash") ||
      (length(c.partition_key_paths) >= 2 && length(c.partition_key_paths) <= 3 && c.partition_key_kind == "MultiHash")
    ])
    error_message = "Use partition_key_kind = \"Hash\" with one path, or \"MultiHash\" with two or three paths."
  }

  validation {
    condition = alltrue(flatten([
      for c in values(var.containers) : [
        for p in concat(c.included_paths, c.excluded_paths) : endswith(p, "/?") || endswith(p, "/*")
      ]
    ]))
    error_message = "Included and excluded index paths must end in \"/?\" (scalar) or \"/*\" (subtree)."
  }

  validation {
    condition     = alltrue([for c in values(var.containers) : contains(["consistent", "none"], c.indexing_mode)])
    error_message = "indexing_mode must be consistent or none."
  }

  validation {
    condition = alltrue(flatten([
      for c in values(var.containers) : [
        for ci in c.composite_indexes : length(ci) >= 2 && alltrue([for i in ci : contains(["ascending", "descending"], i.order)])
      ]
    ]))
    error_message = "Each composite index needs at least two paths, each ordered ascending or descending."
  }

}

####################################################################################################
# Data-plane RBAC
####################################################################################################

variable "data_contributors" {
  type        = map(string)
  description = "Principals granted the data-plane role on the database, keyed by a STATIC label (e.g. uami, me) => principal (object) ID. Keys must be known at plan time."
  default     = {}

}

variable "data_role_definition_guid" {
  type        = string
  description = "Built-in Cosmos SQL role to assign: 00000000-0000-0000-0000-000000000002 = Data Contributor, ...0001 = Data Reader."
  default     = "00000000-0000-0000-0000-000000000002"

  validation {
    condition     = contains(["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"], var.data_role_definition_guid)
    error_message = "data_role_definition_guid must be a built-in Cosmos SQL role (...0001 Reader or ...0002 Contributor)."
  }

}

####################################################################################################
# Diagnostics
####################################################################################################

variable "log_analytics_id" {
  type        = string
  description = "Log Analytics workspace ID for the account's diagnostic setting."

}
