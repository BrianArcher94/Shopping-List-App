variable "shared" {
  type = any

}

variable "ciam_domain_prefix" {
  description = "Domain prefix of the external tenant: <prefix>.onmicrosoft.com / <prefix>.ciamlogin.com"
  type        = string

}

variable "ciam_display_name" {
  description = "Display name of the external tenant"
  type        = string

}

variable "ciam_location" {
  description = "Data residency geo: United States, Europe, Asia Pacific or Australia"
  type        = string

}

variable "ciam_country_code" {
  description = "Two letter country code of the external tenant"
  type        = string

}

variable "ciam_sku_name" {
  description = "SKU name of the external tenant"
  type        = string

}

variable "ciam_sku_tier" {
  description = "SKU tier of the external tenant"
  type        = string
  default     = "A0"

}

variable "tags" {
  default = {}

}