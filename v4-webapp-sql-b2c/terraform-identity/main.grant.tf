# -----------------------------------------------------------------------------
# Admin consent - delegated permission grants.
# External tenants have no user consent, so every delegated scope the SPA requests
# must be granted tenant-wide here.
#
#   SPA -> Shopping List API : access_as_user
#   SPA -> Microsoft Graph   : openid, offline_access (sign-in + refresh tokens)
# -----------------------------------------------------------------------------

resource "time_sleep" "appr_propagation" {
  create_duration = "60s"

  depends_on = [
    module.az-appr-api,
    module.az-appr-spa,
    module.az-appr-graph,
  ]

  # Re-run the wait if either service principal is replaced
  triggers = {
    api_sp_id   = local.appr.count > 0 ? module.az-appr-api[0].appr_sp_object_id : ""
    spa_sp_id   = local.appr.count > 0 ? module.az-appr-spa[0].appr_sp_object_id : ""
    graph_sp_id = local.appr.count > 0 ? module.az-appr-graph[0].appr_sp_object_id : ""
  }
}

# SPA -> Shopping List API
resource "azuread_service_principal_delegated_permission_grant" "spa-to-api" {
  count = local.appr.count

  service_principal_object_id          = module.az-appr-spa[count.index].appr_sp_object_id
  resource_service_principal_object_id = module.az-appr-api[count.index].appr_sp_object_id
  claim_values                         = [local.appr.api_scope]

  depends_on = [time_sleep.appr_propagation]
}

# SPA -> Microsoft Graph
resource "azuread_service_principal_delegated_permission_grant" "spa-to-msgraph" {
  count = local.appr.count

  service_principal_object_id          = module.az-appr-spa[count.index].appr_sp_object_id
  resource_service_principal_object_id = data.azuread_service_principal.msgraph.object_id
  claim_values                         = ["openid", "offline_access"]

  depends_on = [time_sleep.appr_propagation]
}

# -----------------------------------------------------------------------------
# Admin consent - application permission (profile page).
#
#   graph app -> Microsoft Graph : User.ReadWrite.All (app-only)
#
# Needs AppRoleAssignment.ReadWrite.All on the bootstrap SP
# (bootstrap/bootstrap.ps1 -SkipSecret).
# -----------------------------------------------------------------------------
resource "azuread_app_role_assignment" "graph-to-msgraph" {
  for_each = local.appr.count > 0 ? toset(local.appr.graph_app_roles) : toset([])

  app_role_id         = data.azuread_service_principal.msgraph.app_role_ids[each.value]
  principal_object_id = module.az-appr-graph[0].appr_sp_object_id
  resource_object_id  = data.azuread_service_principal.msgraph.object_id

  depends_on = [time_sleep.appr_propagation]
}

# -----------------------------------------------------------------------------
# The graph app's only credential: the PUBLIC certificate of the main root's
# non-exportable Key Vault certificate (terraform/main.grph.tf). Absent until the
# main root has been applied once; then this root's next apply uploads it.
# Rotation: renew the certificate in the main root, apply main, apply this root.
# -----------------------------------------------------------------------------
locals {
  grph_certificate = data.terraform_remote_state.main.outputs.grph_certificate
}

resource "azuread_application_certificate" "graph" {
  count = local.appr.count > 0 && local.grph_certificate != null ? 1 : 0

  application_id = module.az-appr-graph[0].appr_id
  type           = "AsymmetricX509Cert"
  encoding       = "base64"
  value          = local.grph_certificate.certificate_data_base64
  start_date     = local.grph_certificate.not_before
  end_date       = local.grph_certificate.expires
}
