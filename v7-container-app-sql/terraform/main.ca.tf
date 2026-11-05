locals {
  ca = {

    # Pass 2 only: the image must already be in ACR before the app's first revision.
    count = var.deploy_container_apps ? lookup(var.ca_count, terraform.workspace) : 0

    tag_map = {
      1 = "${upper(local.prefix)} Web Container App"
    }
  }
}

variable "ca_count" {
  description = "Number of web container apps per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-uks" = 0
  }

}

# Web tier: serves the SPA and proxies /api to the Function App over its private endpoint
# (plan §9.2, C6). Image changes after the first revision come from the app pipeline.
module "az-ca" {
  source = "./modules/az-ca"

  shared = local.shared
  count  = local.ca.count

  ca_name        = "${local.namingconstant}-capp-web-${local.loc}-${format("%03d", count.index + 1)}"
  environment_id = module.az-ce[0].ce_id

  uami_id         = module.az-core.msid_id
  registry_server = module.az-cr[0].cr_login_server
  container_name  = "web"
  image           = "${module.az-cr[0].cr_login_server}/web:${var.web_image_tag}"

  cpu              = 0.25
  memory           = "0.5Gi"
  target_port      = 8080
  external_enabled = true # VNet-visible only: the environment is internal
  health_path      = "/healthz"

  min_replicas     = 1 # C9: no cold starts for the web tier
  max_replicas     = 3
  http_concurrency = 10

  env = {
    # The Function App's default hostname resolves to its private endpoint through the
    # privatelink.azurewebsites.net zone linked to the spoke.
    API_PROXY_TARGET  = "https://${module.az-fnap[0].fnap_default_hostname}"
    OTEL_SERVICE_NAME = "web"
  }

  # Key Vault reference, read by the UAMI. Versionless, so Container Apps picks up a
  # rotated value automatically (it re-checks the secret periodically).
  key_vault_secrets = {
    "appinsights-connection-string" = azurerm_key_vault_secret.apin-connection-string.versionless_id
  }
  secret_env = {
    APPLICATIONINSIGHTS_CONNECTION_STRING = "appinsights-connection-string"
  }

  tags = merge(local.default_tags,
    lookup(local.ca.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.ca.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null
  )

  # The first revision pulls as soon as the app is created: wait for AcrPull to
  # propagate (risk R3).
  depends_on = [time_sleep.acr_rbac_propagation]

}
