variable "shared" {
  type = any

}

variable "nsg_name" {
  type = string

}

variable "nsg_rule" {
  type = list(object({
    name               = string
    priority           = number
    direction          = string
    access             = string
    protocol           = string
    source_port_range  = optional(string)
    source_port_ranges = optional(list(string))

    destination_port_range  = optional(string)
    destination_port_ranges = optional(list(string))

    source_address_prefix   = optional(string)
    source_address_prefixes = optional(list(string))

    destination_address_prefix   = optional(string)
    destination_address_prefixes = optional(list(string))

    source_application_security_group_ids      = optional(list(string))
    destination_application_security_group_ids = optional(list(string))

    description = string
  }))

  # Lists don't support '*' for any or service tags.

}

variable "subnet_id" {
  type = string

}

variable "tags" {
  type    = map(string)
  default = {}

}