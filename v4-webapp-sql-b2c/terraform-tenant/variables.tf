variable "build-definition-name" {
  description = "ADO pipeline name"
  default     = "uat"
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

  # Tenant domain prefixes cannot contain hyphens, so the env is spelled out: slab2cdev
  env_long = lookup({ dv = "dev", ts = "test", pp = "preprod", pa = "prod" }, local.env, local.env)



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


  }

}