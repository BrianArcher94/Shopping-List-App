variable "shared" {
  type = any

}

variable "postgres_server_name" {
  type        = string
  description = "Name for the PostgreSQL server name."

}

variable "postgres_config" {
  type = object({
    sku_name        = string
    storage_tier    = string
    version         = string
    storage_size_gb = number
  })
  description = "Server sizing: compute SKU (e.g. B_Standard_B1ms), storage performance tier (e.g. P4), PostgreSQL major version and storage size in GB."

}

variable "pgsql_dns_zone" {
  type        = string
  description = "PostgresSQL private DNS zone."

}

variable "public_network_access_enabled" {
  type        = bool
  description = "Public access to PostgresSQL server enabled"

}

variable "active_directory_auth_enabled" {
  type        = bool
  description = "EntraID auth enabled for PostgresSQL server."
  default     = true

}

variable "tenant_id" {
  type        = string
  description = "Entra ID tenant ID."

}

variable "identity_ids" {
  type        = list(string)
  description = "List of user managed identities to be assigned"
  default     = null

}

variable "pgsql_dbs" {
  type        = list(string)
  description = "PostgresSQL DBs to create"

}

variable "pgsql_configurations" {
  type        = map(string)
  description = "Server parameters to set (name => value)."
  default = {
    "azure.extensions"           = "PG_STAT_STATEMENTS"
    "log_connections"            = "on"
    "log_disconnections"         = "on"
    "log_min_duration_statement" = "1000"
  }

}

variable "pe_subnet_id" {
  type        = string
  description = "ID of private endpoint subnet."

}

variable "pgsql_admins" {
  type = map(object({
    object_id      = string
    principal_type = string
  }))
  description = "Entra administrators keyed by principal name (UPN, group or app display name)."

  validation {
    condition     = alltrue([for a in values(var.pgsql_admins) : contains(["User", "Group", "ServicePrincipal"], a.principal_type)])
    error_message = "principal_type must be one of: User, Group, ServicePrincipal."
  }

}

variable "log_analytics_id" {
  type        = string
  description = "Log Analytics workspace ID for diagnostic settings."

}

variable "tags" {
  description = "resource tags"
  type        = map(string)

  default = {}

}
