variable "shared" {
  type = any

}

variable "dns_zones" {
  description = "Private DNS zones"
  type        = list(string)

}

variable "spoke_vnet_id" {
  type = string
  description = "vnet ID to link zone to"

}

variable "tags" {
  type = map(string)
  description = "Resource tags"
  default = {}

}