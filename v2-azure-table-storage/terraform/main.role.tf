data "azurerm_client_config" "current" {}

  data "azuread_service_principal" "app_service_rp" {
    client_id = "abfa0a7c-a6b6-4736-8310-5855508787cd"
  }

resource "azurerm_role_assignment" "uami-stra" {
  scope                = module.az-stra[0].stra_id.0
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = module.az-core.msid_principal_id

}

resource "azurerm_role_assignment" "uami-blob" {
  scope                = module.az-stra[0].stra_id.0
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.az-core.msid_principal_id

}

# Grant full Key Vault access to the TF Apply managed identity
resource "azurerm_key_vault_access_policy" "uami-kyvt-admin" {
  key_vault_id = module.az-core.kyvt_id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  key_permissions = [
    "Get", "List", "Update", "Create", "Import", "Delete", "Recover",
    "Backup", "Restore", "GetRotationPolicy", "SetRotationPolicy", "Purge",
  ]

  secret_permissions = [
    "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore", "Purge",
  ]

  certificate_permissions = [
    "Get", "List", "Update", "Create", "Import", "Delete", "Recover",
    "Backup", "Restore", "ManageContacts", "ManageIssuers", "GetIssuers",
    "ListIssuers", "SetIssuers", "DeleteIssuers", "Purge",
  ]

  lifecycle {
    ignore_changes = [ 
      object_id
     ]
  }
}

# Grant secret management to the slatbl managed identity
resource "azurerm_key_vault_access_policy" "msid-kyvt-secret-officer" {
  key_vault_id = module.az-core.kyvt_id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = module.az-core.msid_principal_id

  secret_permissions = [
    "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore", "Purge",
  ]

  certificate_permissions = [
    "Get", "List", "Update", "Create", "Import", "Delete", "Recover",
    "Backup", "Restore", "ManageContacts", "ManageIssuers", "GetIssuers",
    "ListIssuers", "SetIssuers", "DeleteIssuers", "Purge",
  ]
}

# # Assign Key Vault Secret User role to web app system identity
resource "azurerm_key_vault_access_policy" "wapp-kyvt-access" {
  key_vault_id = module.az-core.kyvt_id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = module.az-wapp[0].wapp_identity_principal_id

  secret_permissions = [
    "Get", "List",
  ]

  certificate_permissions = [
    "Get", "List",
  ]
}

# # Assign Key Vault Secret User role to web app system identity
resource "azurerm_key_vault_access_policy" "apsp-kyvt-access" {
  key_vault_id = module.az-core.kyvt_id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azuread_service_principal.app_service_rp.object_id # App service appId - https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-certificate?tabs=apex%2Crbac%2Cazure-cli

  secret_permissions = [
    "Get", "List",
  ]

  certificate_permissions = [
    "Get", "List",
  ]
}