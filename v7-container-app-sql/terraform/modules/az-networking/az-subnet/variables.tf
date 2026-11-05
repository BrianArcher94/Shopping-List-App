variable "shared" {
  type = any

}

variable "subnet_name" {
  type = string

}

variable "virtual_network_name" {
  type = string

}

variable "address_prefixes" {
  type = list(string)

}

variable "delegations" {
  type = list(object({
    name = string
    service_delegation = object({
      name    = string
      actions = list(string)
    })
  }))
  default = []

}

variable "default_outbound_access_enabled" {
  type    = bool
  default = true

}

variable "private_endpoint_network_policies" {
  type    = string
  default = null

}

variable "private_link_service_network_policies_enabled" {
  type    = bool
  default = true

}

variable "service_endpoints" {
  type    = list(string)
  default = []

}

variable "service_endpoint_policy_ids" {
  type    = list(string)
  default = []

}