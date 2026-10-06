terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "4.70.0"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "3.8.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.12"
    }

  }
}

provider "azurerm" {
  subscription_id = "<SubscriptionId>"
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }

    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }

}

provider "azuread" {
  tenant_id = "<TenantId"
}



