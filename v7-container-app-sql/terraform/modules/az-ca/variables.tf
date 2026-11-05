variable "shared" {
  type = any

}

variable "ca_name" {
  description = "Container app name (max 32 characters, lowercase letters, numbers and hyphens)."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,30}[a-z0-9]$", var.ca_name)) && !strcontains(var.ca_name, "--")
    error_message = "ca_name must be 2-32 lowercase letters, numbers or single hyphens, starting with a letter."
  }

}

variable "environment_id" {
  description = "Container Apps environment ID (az-ce ce_id)."
  type        = string

}

variable "uami_id" {
  description = "User-assigned identity used for ACR pulls and Key Vault secret references."
  type        = string

}

variable "registry_server" {
  description = "ACR login server, e.g. <name>.azurecr.io (az-cr cr_login_server)."
  type        = string

}

variable "container_name" {
  type    = string
  default = "app"

}

variable "image" {
  description = "Initial image (<registry>/<repo>:<tag>). Later changes are ignored - the app pipeline deploys new tags."
  type        = string

}

variable "cpu" {
  description = "vCPU per replica. On Consumption, memory must be 2x cpu in Gi (0.25 / 0.5Gi, 0.5 / 1Gi, ...)."
  type        = number
  default     = 0.25

}

variable "memory" {
  type    = string
  default = "0.5Gi"

  validation {
    condition     = can(regex("^[0-9.]+Gi$", var.memory))
    error_message = "memory must be in Gi, e.g. \"0.5Gi\"."
  }

}

variable "target_port" {
  type    = number
  default = 8080

}

variable "external_enabled" {
  description = "In an internal environment this means reachable from the VNet, not the internet."
  type        = bool
  default     = true

}

variable "min_replicas" {
  type    = number
  default = 1

}

variable "max_replicas" {
  type    = number
  default = 3

  validation {
    condition     = var.max_replicas >= var.min_replicas
    error_message = "max_replicas must be >= min_replicas."
  }

}

variable "http_concurrency" {
  description = "Concurrent HTTP requests per replica before scaling out."
  type        = number
  default     = 10

}

variable "health_path" {
  description = "Path for the startup, readiness and liveness probes."
  type        = string
  default     = "/healthz"

}

variable "env" {
  description = "Plain environment variables (name => value)."
  type        = map(string)
  default     = {}

}

variable "key_vault_secrets" {
  description = "App secrets backed by Key Vault (secret name => versionless Key Vault secret ID)."
  type        = map(string)
  default     = {}

}

variable "secret_env" {
  description = "Environment variables read from app secrets (env var name => secret name in key_vault_secrets)."
  type        = map(string)
  default     = {}

  validation {
    condition     = alltrue([for s in values(var.secret_env) : contains(keys(var.key_vault_secrets), s)])
    error_message = "Every secret_env value must be a key of key_vault_secrets."
  }

}

variable "tags" {
  type    = map(string)
  default = {}

}
