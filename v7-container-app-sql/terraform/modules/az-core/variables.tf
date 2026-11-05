variable "shared" {
  type = any

}

variable "create_kyvt" {
  description = "Boolean to create key vault resource"
  type        = bool

}

variable "create_apin" {
  description = "Boolean to create application insights resource"
  type        = bool

}

variable "create_loga" {
  description = "Boolean to create log analytics resource"
  type        = bool

}

variable "create_msid" {
  description = "Boolean to create managed identity resource"
  type        = bool

}

variable "kyvt_dns_zone" {
  description = "Key vault private DNS zone"
  type        = string

}

variable "pe_subnet_id" {
  description = "Subnet for private endpoints"
  type        = string

}