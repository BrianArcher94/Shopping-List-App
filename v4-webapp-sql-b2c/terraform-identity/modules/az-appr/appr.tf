resource "random_uuid" "scope" {
  for_each = { for scope in var.oauth2_scopes : scope.value => scope }
}

# App Registration
resource "azuread_application" "main" {
  display_name            = var.appr_name
  sign_in_audience        = var.sign_in_audience
  owners                  = var.owners
  notes                   = var.notes
  prevent_duplicate_names = true

  # Always rendered: an external tenant rejects ANY app registration whose access token
  # version is 1 or null (InvalidAccessTokenVersion), not just apps that expose an API.
  api {
    # Without this, access tokens are v1-shaped: different issuer and audience format
    requested_access_token_version = 2

    # Rendered only for an app that EXPOSES an API
    dynamic "oauth2_permission_scope" {
      for_each = { for scope in var.oauth2_scopes : scope.value => scope }
      content {
        id                         = random_uuid.scope[oauth2_permission_scope.key].result
        value                      = oauth2_permission_scope.value.value
        type                       = "Admin" # external tenants have no user consent
        enabled                    = true
        admin_consent_display_name = oauth2_permission_scope.value.display_name
        admin_consent_description  = oauth2_permission_scope.value.description
      }
    }
  }

  # Rendered only for a browser app. Platform must be SPA (not "web") for auth code + PKCE.
  dynamic "single_page_application" {
    for_each = length(var.spa_redirect_uris) > 0 ? [1] : []
    content {
      redirect_uris = var.spa_redirect_uris
    }
  }

  # Rendered once per resource this app CALLS
  dynamic "required_resource_access" {
    for_each = var.required_resource_access
    content {
      resource_app_id = required_resource_access.value.resource_app_id

      dynamic "resource_access" {
        for_each = required_resource_access.value.scope_ids
        content {
          id   = resource_access.value
          type = "Scope"
        }
      }

      # Application permissions (app-only). Requesting is not granting: each needs an
      # azuread_app_role_assignment (admin consent) in the calling root.
      dynamic "resource_access" {
        for_each = required_resource_access.value.role_ids
        content {
          id   = resource_access.value
          type = "Role"
        }
      }
    }
  }

  dynamic "optional_claims" {
    for_each = length(var.access_token_claims) > 0 ? [1] : []
    content {
      dynamic "access_token" {
        for_each = toset(var.access_token_claims)
        content {
          name = access_token.value
        }
      }
    }
  }

  lifecycle {
    # Owned by azuread_application_identifier_uri below; without this the two resources fight
    ignore_changes = [identifier_uris]
  }
}

# api://<client_id> refers to the app's own ID, so it cannot be set inline - separate resource
resource "azuread_application_identifier_uri" "main" {
  count          = length(var.oauth2_scopes) > 0 ? 1 : 0
  application_id = azuread_application.main.id
  identifier_uri = "api://${azuread_application.main.client_id}"
}

# Service Principal (the "enterprise application"). Consent grants attach to this, not the registration.
resource "azuread_service_principal" "main" {
  client_id                    = azuread_application.main.client_id
  owners                       = var.owners
  app_role_assignment_required = false
  notes                        = var.notes
}