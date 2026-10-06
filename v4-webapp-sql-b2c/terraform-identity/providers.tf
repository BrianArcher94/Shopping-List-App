terraform {
  required_providers {
    azuread = {
      source  = "hashicorp/azuread"
      version = "3.8.0"
    }

    msgraph = {
      source  = "microsoft/msgraph"
      version = "0.5.0"
    }

    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }

    time = {
      source  = "hashicorp/time"
      version = "~> 0.12"
    }

    http = {
      source  = "hashicorp/http"
      version = "~> 3.4"
    }

  }
}


provider "azuread" {
  tenant_id     = local.ciam_tenant_id
  client_id     = var.ciam_client_id
  client_secret = var.ciam_client_secret
  use_cli       = false
}

provider "msgraph" {
  tenant_id     = local.ciam_tenant_id
  client_id     = var.ciam_client_id
  client_secret = var.ciam_client_secret
  use_cli       = false
}