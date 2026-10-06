

variable "build-definition-name" {
  description = "ADO pipeline name"
  default     = "uat"
}

variable "set_fnap_job_key" {
  description = "Register the Logic App's function key on the Function App. ARM proxies host-key writes to the Functions host runtime, which cannot start on a Flex Consumption app until code has been deployed. Fresh environment: apply with false -> run fnap-deploy.yml -> set true -> apply again."
  type        = bool
  default     = true
}

variable "auth_require_mfa" {
  description = "Defence in depth for the MFA Conditional Access policy: the API also refuses tokens whose amr claim lacks 'mfa'. Turn on only after terraform-identity's cnac_state = enabled AND a post-MFA token was confirmed to carry amr (b2c-mfa-plan.html section 7)."
  type        = bool
  default     = true
}

variable "sql_public_access" {
  description = "Open the SQL server's public endpoint (home-IP firewall rule applies). true only while running migrations from a laptop."
  type        = bool
  default     = true
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

  # Public hostname. Must match terraform-identity/variables.tf (the SPA redirect URI is registered against it).
  hostname = "<Hostname>"



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

    resg = {
      location = azurerm_resource_group.main[0].location
      name     = azurerm_resource_group.main[0].name
      id       = azurerm_resource_group.main[0].id
    }

    ip_address      = "X.X.X.X"
    ip_address_cidr = "X.X.X.X/32"


  }

}
