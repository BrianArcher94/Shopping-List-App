locals {
  fnap = {

    count = lookup(var.fnap_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} BA Testing"
    }

    # Hoisted so the same map feeds BOTH the module and the appsettings fix-up
    # action below (they must be identical: the fix-up PUT replaces the whole set).
    app_settings = merge({
      STORAGE_ACCOUNT_NAME                  = module.az-stra[0].stra_name.0
      AZURE_CLIENT_ID                       = module.az-core.msid_client_id
      APPLICATIONINSIGHTS_CONNECTION_STRING = module.az-core.apin_connection_string
      SQL_SERVER_FQDN                       = module.az-sql[0].sql_fqdn
      SQL_DATABASE_NAME                     = module.az-sql[0].sql_dbnames[0]

      # Host storage (AzureWebJobsStorage) over managed identity. Flex Consumption
      # keeps function keys, host locks and diagnostics here, so it MUST work -
      # anonymous HTTP routes run without it, key management does not.
      # Roles: main.role.tf (Blob Data Owner + Queue/Table Data Contributor).
      AzureWebJobsStorage__accountName = module.az-stra[0].stra_name.0
      AzureWebJobsStorage__credential  = "managedidentity"
      AzureWebJobsStorage__clientId    = module.az-core.msid_client_id

      # External ID - JWT validation
      AUTH_ISSUER         = local.idn.issuer
      AUTH_JWKS_URI       = local.idn.jwks_uri
      AUTH_AUDIENCE       = local.idn.audience
      AUTH_REQUIRED_SCOPE = local.idn.required_scope
      AUTH_REQUIRE_MFA    = var.auth_require_mfa ? "true" : "false"
    }, local.grph_app_settings) # profile page: Graph credential + photo container (main.grph.tf)
  }
}

variable "fnap_count" {
  description = "Number of Function Apps per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

module "az-fnap" {
  source = "./modules/az-fnap"

  shared = local.shared
  count  = local.fnap.count

  fnap_apsp_name = "${local.namingconstant}-fnap-apsp-${local.loc}-${format("%03d", count.index + 1)}"
  fnap_sku       = "FC1"
  fnap_os_type   = "Linux"

  fnap_name                         = "${local.namingconstant}-fnap-${local.loc}-${format("%03d", count.index + 1)}"
  storage_container_type            = "blobContainer"
  storage_container_endpoint        = "https://${module.az-stra[0].stra_name[0]}.blob.core.windows.net/fnap-data"
  storage_authentication_type       = "UserAssignedIdentity"
  storage_user_assigned_identity_id = module.az-core.msid_id
  runtime_name                      = "node"
  runtime_version                   = "24"

  app_settings = local.fnap.app_settings

  public_network_access_enabled = true
  virtual_network_subnet_id     = module.az-snet[2].subnet_id
  identity_ids                  = [module.az-core.msid_id]

  site_config = [
    {
      vnet_route_all_enabled = true

      ip_restriction_default_action     = "Deny"
      scm_ip_restriction_default_action = "Deny"
      scm_use_main_ip_restriction       = true

      ip_restriction = [
        {
          action      = "Allow"
          ip_address  = local.shared.ip_address_cidr
          name        = "BA"
          priority    = 100
          description = "BA IP"
        }
      ]
    }
  ]

  pe_subnet_id     = module.az-snet[4].subnet_id
  fnap_dns_zone    = module.az-dns.private_dns_zones["privatelink.azurewebsites.net"].id
  log_analytics_id = module.az-core.loga_id

  tags = merge(local.default_tags,
    lookup(local.fnap.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.fnap.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null

  )

}

# -----------------------------------------------------------------------------
# Provider bug workaround - azurerm_function_app_flex_consumption (4.70) always
# injects  AzureWebJobsStorage = "DefaultEndpointsProtocol=https;AccountName=..;AccountKey=;.."
# with an EMPTY key when storage_authentication_type is an identity, and strips
# it again on Read, so it can neither be overridden nor removed via app_settings
# (hashicorp/terraform-provider-azurerm #30732, #33211; fix pending in PR #29099).
# The host reads that connection string before the __accountName settings, so
# host storage is broken: no azure-webjobs-secrets container, and every key
# operation fails with "InternalServerError from host runtime".
#
# Fix-up: PUT the complete, correct app-settings set straight after the module.
# Re-runs whenever local.fnap.app_settings changes, which is also when azurerm
# would re-inject. The check block warns if the bad setting is back.
# Remove this block once the provider fix ships.
# -----------------------------------------------------------------------------
resource "azapi_resource_action" "fnap-appsettings" {
  count = local.fnap.count

  type        = "Microsoft.Web/sites/config@2023-12-01"
  resource_id = "${module.az-fnap[count.index].fnap_id}/config/appsettings"
  method      = "PUT"

  body = {
    properties = local.fnap.app_settings
  }

  depends_on = [module.az-fnap, time_sleep.stra_rbac_propagation]
}

# App-settings changes restart the host. Give it time before anything talks to
# it through ARM (the job key in main.kyvt.tf).
resource "time_sleep" "fnap_restart" {
  count           = local.fnap.count
  create_duration = "90s"

  triggers = {
    settings = sha256(jsonencode(local.fnap.app_settings))
  }

  depends_on = [azapi_resource_action.fnap-appsettings]
}

check "fnap-appsettings-clean" {
  data "azapi_resource_action" "fnap-appsettings" {
    type        = "Microsoft.Web/sites/config@2023-12-01"
    resource_id = "${module.az-fnap[0].fnap_id}/config/appsettings"
    action      = "list"
    method      = "POST"

    response_export_values = ["properties"]
  }

  assert {
    condition     = !contains(keys(try(data.azapi_resource_action.fnap-appsettings.output.properties, {})), "AzureWebJobsStorage")
    error_message = "The Function App has the provider-injected AzureWebJobsStorage setting again (empty AccountKey). Re-run the fix-up: terraform apply -replace='azapi_resource_action.fnap-appsettings[0]'."
  }
}
