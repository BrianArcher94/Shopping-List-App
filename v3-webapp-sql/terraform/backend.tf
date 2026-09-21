terraform {
  backend "azurerm" {
    resource_group_name  = "<RgName>"
    storage_account_name = "<StorageAccountName>"
    container_name       = "<ContainerName>"
    key                  = "<KeyName>"

    use_azuread_auth = true
  }
}
