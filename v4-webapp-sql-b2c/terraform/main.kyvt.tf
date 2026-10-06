resource "azurerm_key_vault_secret" "main-ssl" {
  name         = "CloudFlare-Client-Origin-Cert"
  key_vault_id = module.az-core.kyvt_id
  content_type = "application/x-pkcs12"
  value        = filebase64("${path.module}/cert/client-cert/origin.pfx")



  depends_on = [
    module.az-core,
    time_sleep.kyvt_rbac_propagation
  ]

}

# -----------------------------------------------------------------------------
# V4: function key for the weekly-list job.
# The Logic App has no user, so POST /api/jobs/create-weekly-list is guarded by
# a Functions host key (authLevel 'function') rather than a bearer token.
# Terraform owns the key end to end: generate it, register it on the Function
# App as a named host key, store it in Key Vault, and hand the Logic App a
# Key Vault reference (main.lgaps.tf). The value never appears in workflow.json.
# -----------------------------------------------------------------------------

resource "random_password" "fnap-job-key" {
  length  = 48
  special = false
}

# Named host-level function key, set through ARM because azurerm has no resource
# for host keys. NOT an azapi_resource: ARM exposes PUT/DELETE on
# .../host/default/functionKeys/{name} but no GET (keys are read via the listKeys
# POST), and azapi_resource GETs before every create -> 405 Method Not Allowed.
# azapi_resource_action fires the PUT once and never reads back. The key is
# idempotent (PUT upserts) and stays on the app if this resource is destroyed.
# CONFIRMED: on a Flex Consumption app with no code deployed this returns
# 400 "Encountered an error (InternalServerError) from host runtime", because the
# host cannot start without a package. Hence var.set_fnap_job_key: false on the
# first apply of a fresh environment, true once fnap-deploy.yml has run.
# The Key Vault secret and the Logic App reference below do not need the host,
# so they are created on the first pass regardless.
resource "azapi_resource_action" "fnap-job-key" {
  count = var.set_fnap_job_key ? 1 : 0

  type        = "Microsoft.Web/sites/host/functionKeys@2023-12-01"
  resource_id = "${module.az-fnap[0].fnap_id}/host/default/functionKeys/logicapp"
  method      = "PUT"

  body = {
    properties = {
      name  = "logicapp"
      value = random_password.fnap-job-key.result
    }
  }

  # Host storage must be working (fix-up + roles) and the host restarted first.
  depends_on = [module.az-fnap, time_sleep.fnap_restart]
}

resource "azurerm_key_vault_secret" "fnap-job-key" {
  name         = "fnap-job-key"
  key_vault_id = module.az-core.kyvt_id
  content_type = "text/plain"
  value        = random_password.fnap-job-key.result

  depends_on = [
    module.az-core,
    time_sleep.kyvt_rbac_propagation
  ]

}
