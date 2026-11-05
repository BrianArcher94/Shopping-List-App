variable "shared" {
  type = any

}

variable "dns_zones" {
  description = "Private DNS zones"
  type        = list(string)

}

variable "spoke_vnet_id" {

}

variable "tags" {
  default = {}

}