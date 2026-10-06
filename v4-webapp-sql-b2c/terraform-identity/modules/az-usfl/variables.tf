variable "shared" {
  type = any

}

variable "usfl_name" {
  description = "Display name of the user flow"
  type        = string

}

variable "usfl_description" {
  description = "Description of the user flow"
  type        = string
  default     = null

}

variable "sign_up_allowed" {
  description = "Whether new users can self-register. Set false once the household accounts exist"
  type        = bool
  default     = true

}

variable "identity_provider_ids" {
  description = "Identity provider IDs. EmailPassword-OAUTH = email with password, EmailOtpSignup-OAUTH = email one-time passcode"
  type        = list(string)

}

variable "attributes" {
  description = "Attributes collected at sign-up"
  type = list(object({
    id       = string
    label    = string
    required = bool
    editable = bool
    hidden   = bool
  }))

}

variable "usfl_applications" {
  description = "Applications linked to the user flow"
  type        = map(string)

}