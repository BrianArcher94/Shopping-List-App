variable "shared" {
  type = any

}

variable "ciam_client_id" {
  description = "Client ID of the bootstrap Terraform service principal - the script authenticates to Graph as it"
  type        = string

}

variable "ciam_client_secret" {
  description = "Client secret of the bootstrap Terraform service principal"
  type        = string
  sensitive   = true

}

variable "background_color" {
  description = "Page background behind the sign-in box, #RRGGBB"
  type        = string

  validation {
    condition     = can(regex("^#[0-9a-fA-F]{6}$", var.background_color))
    error_message = "background_color must be a #RRGGBB hex colour."
  }

}

variable "sign_in_text" {
  description = "Text shown at the bottom of the sign-in box (max 1024 characters)"
  type        = string
  default     = ""

  validation {
    condition     = length(var.sign_in_text) <= 1024
    error_message = "sign_in_text must be 1024 characters or fewer."
  }

}

variable "images" {
  description = "Branding images keyed by Graph stream property (bannerLogo, squareLogo, favicon, ...) - local PNG paths"
  type        = map(string)

  validation {
    condition     = alltrue([for k in keys(var.images) : contains(["bannerLogo", "squareLogo", "squareLogoDark", "favicon", "backgroundImage", "headerLogo"], k)])
    error_message = "images keys must be Graph organizationalBranding stream properties."
  }

}
