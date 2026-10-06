locals {
  appr = {

    count = lookup(var.appr_count, terraform.workspace)

    api_scope = "access_as_user"

    tag_map = {
      api   = "${upper(local.prefix)} Shopping List API - resource server, validated by the Function App"
      spa   = "${upper(local.prefix)} Shopping List SPA - public client, auth code + PKCE"
      graph = "${upper(local.prefix)} Shopping List API -> Microsoft Graph - app-only, profile page (credential: Key Vault certificate)"
    }

    # Application permission for the profile page: read/update/delete the caller's
    # own user, profile photo, revoke sessions. User.ReadWrite.All is the least
    # privilege covering all of them; app-only it cannot touch admin-role holders.
    graph_app_roles = ["User.ReadWrite.All"]


    spa_redirect_uris = {
      "dv-ukw" = ["https://${local.hostname}/", "http://localhost:5173/"]
    }
  }
}

variable "appr_count" {
  description = "Number of app registration sets (API + SPA) per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

# Resource server: represents the Function App. Never signs anyone in, has no redirect URIs and no secret.
module "az-appr-api" {
  source = "./modules/az-appr"

  shared = local.shared
  count  = local.appr.count

  appr_name = "${local.namingconstant}-api-appr-${local.loc}-${format("%03d", count.index + 1)}"
  owners    = [data.azuread_client_config.current.object_id]
  notes     = "Deployed By Terraform | ${local.appr.tag_map["api"]}"

  oauth2_scopes = [
    {
      value        = local.appr.api_scope
      display_name = "Access the Shopping List API as the signed-in user"
      description  = "Allows the Shopping List web app to call the API on behalf of the signed-in user."
    }
  ]

  access_token_claims = ["email", "preferred_username"]

}

# Public client: the React SPA. No credentials - PKCE replaces the client secret.
module "az-appr-spa" {
  source = "./modules/az-appr"

  shared = local.shared
  count  = local.appr.count

  appr_name = "${local.namingconstant}-spa-appr-${local.loc}-${format("%03d", count.index + 1)}"
  owners    = [data.azuread_client_config.current.object_id]
  notes     = "Deployed By Terraform | ${local.appr.tag_map["spa"]}"

  spa_redirect_uris = lookup(local.appr.spa_redirect_uris, terraform.workspace, [])

  required_resource_access = [
    {
      resource_app_id = module.az-appr-api[count.index].appr_client_id
      scope_ids       = [module.az-appr-api[count.index].appr_scope_ids[local.appr.api_scope]]
    },
    {
      resource_app_id = data.azuread_service_principal.msgraph.client_id
      scope_ids = [
        data.azuread_service_principal.msgraph.oauth2_permission_scope_ids["openid"],
        data.azuread_service_principal.msgraph.oauth2_permission_scope_ids["offline_access"],
      ]
    }
  ]

}

# Confidential client used by the Function App to call Microsoft Graph for the
# profile page. It has NO secret: its only credential is the public certificate
# uploaded in main.grant.tf, whose private key never leaves the main root's Key
# Vault. A managed identity cannot be used directly - see main.grph.tf (terraform/).
module "az-appr-graph" {
  source = "./modules/az-appr"

  shared = local.shared
  count  = local.appr.count

  appr_name = "${local.namingconstant}-graph-appr-${local.loc}-${format("%03d", count.index + 1)}"
  owners    = [data.azuread_client_config.current.object_id]
  notes     = "Deployed By Terraform | ${local.appr.tag_map["graph"]}"

  required_resource_access = [
    {
      resource_app_id = data.azuread_service_principal.msgraph.client_id
      role_ids        = [for r in local.appr.graph_app_roles : data.azuread_service_principal.msgraph.app_role_ids[r]]
    }
  ]

}
