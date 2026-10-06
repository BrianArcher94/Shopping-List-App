terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "4.70.0"
    }

    azapi = {
      source  = "Azure/azapi"
      version = "2.12.0"
    }

  }
}

provider "azurerm" {
  subscription_id = "<SubscriptionId>"
  features {
    resource_group {
      # Opposite of the main root on purpose: this RG holds the tenant link.
      prevent_deletion_if_contains_resources = true
    }
  }

}

provider "azapi" {
  subscription_id = "<SubscriptionId>"
}