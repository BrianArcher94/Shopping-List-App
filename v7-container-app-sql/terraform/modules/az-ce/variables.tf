variable "shared" {
  type = any

}

variable "ce_name" {
  type = string

}

variable "log_analytics_workspace_id" {
  type = string

}

variable "infrastructure_subnet_id" {
  description = "Subnet delegated to Microsoft.App/environments (snet-cae)."
  type        = string

}

variable "internal_load_balancer_enabled" {
  description = "Private static IP only, no public endpoint. Changing it replaces the environment."
  type        = bool
  default     = true

}

variable "infrastructure_resource_group_name" {
  description = "Name of the platform-managed resource group. Changing it replaces the environment."
  type        = string

}

variable "tags" {
  type = map(string)

}
