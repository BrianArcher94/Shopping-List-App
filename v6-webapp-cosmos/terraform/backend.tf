terraform {
  backend "azurerm" {
    resource_group_name  = "<RgName>"
    storage_account_name = "<StorageAccountName>"
    container_name       = "<ContainerName>"
    key                  = "slacdb-alm.tfstate"

    use_azuread_auth = true
  }
}
