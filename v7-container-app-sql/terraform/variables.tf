

variable "build-definition-name" {
  description = "ADO pipeline name"
  default     = "uat"
}

# Two-pass apply (plan §13.3). Pass 1 (false) builds everything the image needs to exist
# first: network, ACR, environment, Function App, SQL. Push web:<tag> to ACR, then pass 2
# (true) adds the web container app and the App Gateway in front of it.
variable "deploy_container_apps" {
  description = "Create the web container app and App Gateway (pass 2)."
  type        = bool
  default     = false
}

variable "web_image_tag" {
  description = "Tag of the web image in ACR (web:<tag>) for the container app's first revision. Later image changes come from the app pipeline and are ignored by Terraform."
  type        = string
  default     = null

  validation {
    condition     = !var.deploy_container_apps || var.web_image_tag != null
    error_message = "web_image_tag is required when deploy_container_apps is true."
  }

  # Tags are semantic-release versions (web-build-deploy). Catch typos such as "1.0.0," or
  # "web-v1.0.0" at plan time rather than as a 400 from Container Apps halfway through apply.
  validation {
    condition     = var.web_image_tag == null || can(regex("^[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?$", var.web_image_tag))
    error_message = "web_image_tag must be a bare version such as 1.0.0 (no web-v prefix, spaces or punctuation)."
  }
}

####################################################################################################
# LOCALS
####################################################################################################

locals {


  target_project = "slasqlcon"

  prefix = "slasqlcon"

  env      = element(split("-", lower(terraform.workspace)), 0)
  location = element(split("-", lower(terraform.workspace)), 1) == "ukw" ? "ukwest" : "uksouth"
  loc      = local.location == "uksouth" ? "uks" : "ukw"

  namingconstant = "${local.prefix}-${local.env}"



  default_tags = {
    "Deployed By" = "Terraform"
    Env           = upper(local.env)
    Project       = upper(local.prefix)
    "Cost Centre" = upper(local.prefix)
    Version       = "V7"
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
