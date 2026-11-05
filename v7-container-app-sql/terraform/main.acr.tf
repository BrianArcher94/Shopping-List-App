locals {
  cr = {

    count = lookup(var.cr_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} Web Container Registry"
    }
  }
}

variable "cr_count" {
  description = "Number of container registries per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-uks" = 0
  }

}

module "az-cr" {
  source = "./modules/az-cr"

  shared = local.shared
  count  = local.cr.count

  # Alphanumeric only, globally unique: slasqlcondvacrukw001
  cr_name = "${local.prefix}${local.env}acr${local.loc}${format("%03d", count.index + 1)}"
  cr_sku  = "Premium"

  # Public endpoint stays on, firewall default Deny: ACR Tasks (az acr build) comes in
  # through the AzureServices bypass, and the build agent / your IP through allowed_ips.
  # The web container pulls over the private endpoint (plan §10.1, §10.3).
  public_network_access_enabled = true
  network_rule_bypass_option    = "AzureServices"
  allowed_ips                   = [local.shared.ip_address]

  data_endpoint_enabled   = true
  untagged_retention_days = 7

  private_endpoint_enabled = true
  pe_subnet_id             = local.snet_id["pe"]
  cr_dns_zone_id           = module.az-dns.private_dns_zones["privatelink.azurecr.io"].id

  log_analytics_id = module.az-core.loga_id

  tags = merge(local.default_tags,
    lookup(local.cr.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.cr.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null
  )

}

# -----------------------------------------------------------------------------
# Registry RBAC
# -----------------------------------------------------------------------------

# App managed identity - image pulls by the web container app (registry.identity).
resource "azurerm_role_assignment" "msid-acr-pull" {
  count = local.cr.count

  scope                = module.az-cr[0].cr_id
  role_definition_name = "AcrPull"
  principal_id         = module.az-core.msid_principal_id
}

# TF Apply managed identity - runs az acr build from the app pipeline. AcrPush alone
# can't start a task (needs scheduleRun/action, listBuildSourceUploadUrl/action and
# runs/*), so Contributor scoped to the registry only. Swap for a custom role with just
# those actions if you want it tighter (plan §12).
resource "azurerm_role_assignment" "uami-acr-contributor" {
  count = local.cr.count

  scope                = module.az-cr[0].cr_id
  role_definition_name = "Contributor"
  principal_id         = "<MiID>" #TF Apply MI
}

# The container app's first revision pulls as soon as it's created. Give the AcrPull
# assignment time to propagate, or the revision fails with UNAUTHORIZED (risk R3).
# main.ca.tf depends on this.
resource "time_sleep" "acr_rbac_propagation" {
  count = local.cr.count

  create_duration = "60s"

  depends_on = [
    azurerm_role_assignment.msid-acr-pull,
  ]

  # Re-run the wait if the assignment is replaced
  triggers = {
    acr_pull_id = azurerm_role_assignment.msid-acr-pull[0].id
  }
}
