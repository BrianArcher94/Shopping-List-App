variable "shared" {
  type = any

}

variable "hub_to_spoke_peering_name" {
  type = string

}

variable "hub_to_spoke_hub_vnet_name" {
  type = string

}

variable "hub_to_spoke_spoke_vnet_id" {
  type = string

}

variable "hub_to_spoke_allow_virtual_network_access" {
  type    = bool
  default = true
}

variable "hub_to_spoke_allow_forwarded_traffic" {
  type    = bool
  default = false

}

variable "hub_to_spoke_allow_gateway_transit" {
  type    = bool
  default = false

}

variable "hub_to_spoke_local_subnet_names" {
  type    = list(string)
  default = []

}

variable "hub_to_spoke_only_ipv6_peering_enabled" {
  type    = bool
  default = false
}

variable "hub_to_spoke_peer_complete_virtual_networks_enabled" {
  type    = bool
  default = true

}

variable "hub_to_spoke_remote_subnet_names" {
  type    = list(string)
  default = []
}

variable "hub_to_spoke_use_remote_gateways" {
  type    = bool
  default = false

}

variable "spoke_to_hub_peering_name" {
  type = string

}

variable "spoke_to_hub_spoke_vnet_name" {
  type = string

}

variable "spoke_to_hub_hub_vnet_id" {
  type = string

}

variable "spoke_to_hub_allow_virtual_network_access" {
  type    = bool
  default = true
}

variable "spoke_to_hub_allow_forwarded_traffic" {
  type    = bool
  default = false

}

variable "spoke_to_hub_allow_gateway_transit" {
  type    = bool
  default = false

}

variable "spoke_to_hub_local_subnet_names" {
  type    = list(string)
  default = []

}

variable "spoke_to_hub_only_ipv6_peering_enabled" {
  type    = bool
  default = false
}

variable "spoke_to_hub_peer_complete_virtual_networks_enabled" {
  type    = bool
  default = true

}

variable "spoke_to_hub_remote_subnet_names" {
  type    = list(string)
  default = []
}

variable "spoke_to_hub_use_remote_gateways" {
  type    = bool
  default = false

}