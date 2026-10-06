locals {
  aume = {

    count = lookup(var.aume_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} Email OTP as second factor"
    }
  }
}

variable "aume_count" {
  description = "Whether to manage the email OTP authentication method per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

# -----------------------------------------------------------------------------
# Authentication methods policy - email one-time passcode enabled for all users.
# -----------------------------------------------------------------------------
resource "msgraph_resource_action" "aume-email" {
  count = local.aume.count

  resource_url = "policies/authenticationMethodsPolicy/authenticationMethodConfigurations"
  action       = "email"
  method       = "PATCH"
  api_version  = "v1.0"

  body = {
    "@odata.type" = "#microsoft.graph.emailAuthenticationMethodConfiguration"
    state         = "enabled"
    includeTargets = [
      { targetType = "group", id = "all_users", isRegistrationRequired = false }
    ]
  }
}

check "aume-email-enabled" {
  data "msgraph_resource" "aume-email" {
    url         = "policies/authenticationMethodsPolicy/authenticationMethodConfigurations/email"
    api_version = "v1.0"

    response_export_values = { state = "state" }
  }

  assert {
    condition     = try(data.msgraph_resource.aume-email.output.state, "") == "enabled"
    error_message = "Email OTP is not enabled in the tenant's authentication methods policy - MFA prompts will fail. Re-run: terraform apply -replace='msgraph_resource_action.aume-email[0]'."
  }
}