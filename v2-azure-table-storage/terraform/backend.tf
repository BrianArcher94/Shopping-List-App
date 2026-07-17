terraform {
  backend "azurerm" {
    resource_group_name  = "<StateFileRG>"
    storage_account_name = "<StorageAccountName>"
    container_name       = "<ContainerName>"
    key                  = "slatbl-alm.tfstate"

    use_azuread_auth = true
  }
}