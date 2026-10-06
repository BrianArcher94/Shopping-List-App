variable "build-definition-name" {
  description = "ADO pipeline name"
  default     = "uat"
}

variable "ciam_client_id" {
  description = "Client ID of the bootstrap Terraform service principal in the external tenant (TF_VAR_ciam_client_id)"
  type        = string
}

variable "ciam_client_secret" {
  description = "Client secret of the bootstrap Terraform service principal (TF_VAR_ciam_client_secret)"
  type        = string
  sensitive   = true
}

variable "cnac_state" {
  description = "State of the MFA Conditional Access policy. Roll out as enabledForReportingButNotEnforced, then enabled."
  type        = string
  default     = "enabled"

  validation {
    condition     = contains(["disabled", "enabledForReportingButNotEnforced", "enabled"], var.cnac_state)
    error_message = "cnac_state must be disabled, enabledForReportingButNotEnforced or enabled."
  }
}

variable "cnac_excluded_user_ids" {
  description = "Object IDs of accounts excluded from the MFA policy: the tenant admin / break-glass account."
  type        = list(string)
  default     = ["<ObjectID>"]
}

####################################################################################################
# LOCALS
####################################################################################################

locals {


  target_project = "slab2c"

  prefix = "slab2c"

  env      = element(split("-", lower(terraform.workspace)), 0)
  location = element(split("-", lower(terraform.workspace)), 1) == "ukw" ? "ukwest" : "uksouth"
  loc      = local.location == "uksouth" ? "uks" : "ukw"

  namingconstant = "${local.prefix}-${local.env}"


  hostname = "<Hostname>"

  # From terraform-tenant/ via remote state (main.tf)
  ciam_tenant_id     = data.terraform_remote_state.tenant.outputs.ciam_tenant_id
  ciam_domain_prefix = data.terraform_remote_state.tenant.outputs.ciam_domain_prefix
  ciam_login_host    = "${local.ciam_domain_prefix}.ciamlogin.com"



  default_tags = {
    "Deployed By" = "Terraform"
    Env           = upper(local.env)
    Project       = upper(local.prefix)
    "Cost Centre" = upper(local.prefix)
    Version       = "V4"
  }

  shared = {


    tags = local.default_tags

    naming = {
      namingconstant = local.namingconstant
      prefix         = local.prefix
      location       = local.location
      env            = local.env
      loc            = local.loc
    }


    ciam = {
      tenant_id     = local.ciam_tenant_id
      domain_prefix = local.ciam_domain_prefix
      login_host    = local.ciam_login_host
    }


  }

}