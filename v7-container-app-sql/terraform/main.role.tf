data "azurerm_client_config" "current" {}

resource "azurerm_role_assignment" "uami-blob" {
  scope                = module.az-stra[0].stra_id.0
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.az-core.msid_principal_id

}

# -----------------------------------------------------------------------------
# Key Vault access — RBAC (data-plane) instead of access policies.
# The vault sets rbac_authorization_enabled = true (see modules/az-core/kyvt.tf),
# so the access-policy blocks are replaced by role assignments scoped to the vault.
#
# Permission → built-in role mapping:
#   full key/secret/cert admin            -> Key Vault Administrator
#   secret Get/List                       -> Key Vault Secrets User
#   secret full management (Set/Delete/…) -> Key Vault Secrets Officer
#   certificate Get/List                  -> Key Vault Certificate User
#   certificate full management           -> Key Vault Certificates Officer
# -----------------------------------------------------------------------------

# TF Apply managed identity — full Key Vault admin (keys + secrets + certs)
resource "azurerm_role_assignment" "uami-kyvt-admin" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = "<MiID>" #TF Apply MI

}

# TF Plan managed identity — read-only secrets + certificates
resource "azurerm_role_assignment" "uami-kyvt-secret-user" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = "<MiID>" # TF Plan MI
}

resource "azurerm_role_assignment" "uami-kyvt-cert-user" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Certificate User"
  principal_id         = "<MiID>" # TF Plan MI
}

# App managed identity — full secret + certificate management
resource "azurerm_role_assignment" "msid-kyvt-secret-officer" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = module.az-core.msid_principal_id
}

resource "azurerm_role_assignment" "msid-kyvt-cert-officer" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = module.az-core.msid_principal_id
}

# My identity — full secret + certificate management (was: Key Vault Secrets Officer)
resource "azurerm_role_assignment" "ba-kyvt-secret-officer" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = "<ObjectID>"
}

resource "azurerm_role_assignment" "ba-kyvt-cert-officer" {
  scope                = local.shared.resg.id
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = "<ObjectID>"
}

resource "time_sleep" "kyvt_rbac_propagation" {
  create_duration = "120s"

  # Wait starts only after ALL of these exist
  depends_on = [
    azurerm_role_assignment.uami-kyvt-admin,
    azurerm_role_assignment.msid-kyvt-secret-officer,
    azurerm_role_assignment.msid-kyvt-cert-officer,
    azurerm_role_assignment.uami-kyvt-secret-user,
    azurerm_role_assignment.uami-kyvt-cert-user,
    azurerm_role_assignment.ba-kyvt-secret-officer,
    azurerm_role_assignment.ba-kyvt-cert-officer,
  ]
  # Re-run the wait if any assignment is replaced (e.g. principal changes)
  triggers = {
    admin_id = azurerm_role_assignment.uami-kyvt-admin.id
  }
}

# Function App and Logic App system identities - read the App Insights connection string
# Key Vault reference in their app settings (main.kyvt.tf). azurerm doesn't expose
# keyVaultReferenceIdentity on either resource, so App Service resolves references with
# the system-assigned identity. Scoped to the vault, read-only.
#
# Ordering: a system identity only exists once its app does, so the very first start can
# precede this assignment and leave the setting unresolved. The code deployment (Phase 4)
# restarts the app, which re-resolves it; otherwise `az functionapp restart` /
# `az logicapp restart`.
resource "azurerm_role_assignment" "fnap-kyvt-secret-user" {
  count = local.fnap.count

  scope                = module.az-core.kyvt_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.az-fnap[0].fnap_identity_principal_id
}

resource "azurerm_role_assignment" "lgaps-kyvt-secret-user" {
  count = local.lgaps.count

  scope                = module.az-core.kyvt_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.az-lgaps[0].lgap_identity_principal_id
}
