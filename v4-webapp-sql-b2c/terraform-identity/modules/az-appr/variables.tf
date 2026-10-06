variable "shared" {
  type = any

}

variable "appr_name" {
  description = "Display name of the app registration"
  type        = string

}

variable "sign_in_audience" {
  description = "Supported account types. External tenant apps are single tenant: AzureADMyOrg"
  type        = string
  default     = "AzureADMyOrg"

}

variable "owners" {
  description = "Object IDs of the owners of the app registration and service principal"
  type        = list(string)

}

variable "notes" {
  description = "Free text note on the app registration. Stands in for the Purpose tag, which Entra objects do not support"
  type        = string
  default     = null

}

variable "oauth2_scopes" {
  description = "Delegated scopes this app exposes. Empty list = app does not expose an API"
  type = list(object({
    value        = string
    display_name = string
    description  = string
  }))
  default = []

}

variable "spa_redirect_uris" {
  description = "Single page application redirect URIs. Empty list = not a SPA. Must match exactly, trailing slash included"
  type        = list(string)
  default     = []

}

variable "required_resource_access" {
  description = "Permissions this app requests on other resources: scope_ids = delegated (Scope), role_ids = application (Role)"
  type = list(object({
    resource_app_id = string
    scope_ids       = optional(list(string), [])
    role_ids        = optional(list(string), [])
  }))
  default = []

}

variable "access_token_claims" {
  description = "Optional claims to add to access tokens issued for this app"
  type        = list(string)
  default     = []

}