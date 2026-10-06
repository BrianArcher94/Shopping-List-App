variable "shared" {
  type = any

}

variable "sql_server_name" {
  type        = string
  description = "Name of the SQL server"


}

variable "sql_server_version" {
  type        = string
  description = "valuThe version for the new server. Valid values are: 2.0 (for v11 server) and 12.0 (for v12 server). Changing this forces a new resource to be created.e"

}

variable "public_network_access_enabled" {
  type        = bool
  description = "Whether public network access is allowed for this server. Defaults to true."

}

variable "minimum_tls_version" {
  type        = string
  description = "The Minimum TLS Version for all SQL Database and SQL Data Warehouse databases associated with the server. Valid values are: 1.0, 1.1 , 1.2 and Disabled. "
  default     = "1.2"

}

variable "primary_user_assigned_identity_id" {
  type        = string
  description = " Specifies the primary user managed identity id. Required if type within the identity block is set to either SystemAssigned, UserAssigned or UserAssigned and should be set at same time as setting identity_ids."

}

variable "identity_ids" {
  type        = list(string)
  description = "Specifies a list of User Assigned Managed Identity IDs to be assigned to this SQL Server."

}

variable "login_username" {
  type        = string
  description = "The login username of the Azure AD Administrator of this SQL Server."

}

variable "object_id" {
  type        = string
  description = "The object id of the Azure AD Administrator of this SQL Server."

}

variable "sql_server_firewall_rule_name" {
  type        = string
  description = "The name of the firewall rule. Changing this forces a new resource to be created."

}

variable "start_ip" {
  type        = string
  description = "The starting IP address to allow through the firewall for this rule."

}

variable "end_ip" {
  type        = string
  description = "The ending IP address to allow through the firewall for this rule."

}

variable "log_analytics_workspace_id" {
  type        = string
  description = "ID of log analytics workspace."

}

variable "pe_subnet_id" {
  type        = string
  description = "ID of the private endpoints subnet."

}

variable "sql_dns_zone" {
  type        = string
  description = "ID of the SQL DNS zone"

}

variable "sql_dbs" {
  type = map(object({
    collation                   = string
    max_size_gb                 = string
    min_capacity                = number
    auto_pause_delay_in_minutes = number
    sku_name                    = string
    storage_account_type        = string
    geo_backup_enabled          = bool
    zone_redundant              = bool
    }
  ))
}

variable "tags" {
  type        = map(string)
  description = "Map of tags"

}
