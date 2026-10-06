# External ID (CIAM) configuration, published by the terraform-identity/ root.

data "terraform_remote_state" "identity" {
  backend   = "azurerm"
  workspace = terraform.workspace

  config = {
    resource_group_name  = "<RgName>"
    storage_account_name = "<StorageAccountName>"
    container_name       = "<ContainerName>"
    key                  = "slab2c-identity.tfstate"
    use_azuread_auth     = true
  }
}

locals {
  idn = {

    issuer         = data.terraform_remote_state.identity.outputs.ciam_issuer
    jwks_uri       = data.terraform_remote_state.identity.outputs.ciam_jwks_uri
    audience       = data.terraform_remote_state.identity.outputs.appr_api_client_id
    required_scope = data.terraform_remote_state.identity.outputs.appr_api_scope_name

    # Profile page (main.grph.tf). try(): absent until the identity root has been
    # applied with the graph app registration.
    tenant_id       = data.terraform_remote_state.identity.outputs.ciam_tenant_id
    graph_client_id = try(data.terraform_remote_state.identity.outputs.appr_graph_client_id, null)
  }
}