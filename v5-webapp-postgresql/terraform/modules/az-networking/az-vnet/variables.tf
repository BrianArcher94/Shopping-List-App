variable "shared" {
  type = any

}

variable "vnet_name" {
  type = string

}

variable "address_space" {
  type = list(string)

}

variable "dns_servers" {
  type    = list(string)
  default = null

}

variable "bgp_community" {
  type    = string
  default = null

}

variable "ddos_protection_plan" {
  type = object({
    id     = string
    enable = bool
  })
  default = null

}

variable "encryption" {
  type = object({
    enforcement = string
  })
  default = null

}

variable "private_endpoint_vnet_policies" {
  type    = string
  default = null

}

variable "log_analytics_workspace_id" {
  type = string

}

variable "tags" {
  type = map(string)

}

