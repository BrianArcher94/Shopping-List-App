# Sign-up and sign-in user flow (Graph: authenticationEventsFlow)
resource "msgraph_resource" "main" {
  url         = "identity/authenticationEventsFlows"
  api_version = "v1.0"

  body = {
    "@odata.type" = "#microsoft.graph.externalUsersSelfServiceSignUpEventsFlow"
    displayName   = var.usfl_name
    description   = var.usfl_description

    onInteractiveAuthFlowStart = {
      "@odata.type"   = "#microsoft.graph.onInteractiveAuthFlowStartExternalUsersSelfServiceSignUp"
      isSignUpAllowed = var.sign_up_allowed
    }

    onAuthenticationMethodLoadStart = {
      "@odata.type" = "#microsoft.graph.onAuthenticationMethodLoadStartExternalUsersSelfServiceSignUp"
      identityProviders = [
        for idp in var.identity_provider_ids : { id = idp }
      ]
    }

    onAttributeCollection = {
      "@odata.type" = "#microsoft.graph.onAttributeCollectionExternalUsersSelfServiceSignUp"
      attributes = [
        for attr in var.attributes : {
          id           = attr.id
          displayName  = attr.label
          dataType     = "string"
          userFlowAttributeType = "builtIn"
        }
      ]
      attributeCollectionPage = {
        views = [
          {
            inputs = [
              for attr in var.attributes : {
                attribute = attr.id
                label     = attr.label
                inputType = "text"
                hidden    = attr.hidden
                editable  = attr.editable
                writeToDirectory = true
                required  = attr.required
              }
            ]
          }
        ]
      }
    }
  }

  response_export_values = {
    id = "id"
  }
}

# Link applications to the flow.
#
# NOT an msgraph_resource: the includeApplications entity is keyed by appId and has no `id`,
# and Graph exposes only List / Add / Remove on it (no single-item GET). msgraph_resource
# polls GET <url>/<id> after every POST until it stops 404ing, which here is forever
# ("timeout while waiting for state to become 'Done'"). msgraph_resource_action fires the
# POST once and never reads back; Read and Delete are no-ops. Trade-off: no drift repair
# and no unlink on destroy - the check block below at least surfaces drift as a warning.
resource "msgraph_resource_action" "main-app" {
  for_each = var.usfl_applications

  resource_url = "identity/authenticationEventsFlows/${msgraph_resource.main.output.id}/conditions/applications"
  action       = "includeApplications"
  method       = "POST"
  api_version  = "v1.0"

  body = {
    "@odata.type" = "#microsoft.graph.authenticationConditionApplication"
    appId         = each.value
  }
}

# Drift detection for the links: a failed check is a plan/apply WARNING, not an error,
# so it cannot block a fresh deployment where the flow does not exist yet.
check "main-app-linked" {
  data "msgraph_resource" "main-apps" {
    url         = "identity/authenticationEventsFlows/${msgraph_resource.main.output.id}/conditions/applications/includeApplications"
    api_version = "v1.0"

    response_export_values = {
      app_ids = "value[].appId"
    }
  }

  assert {
    condition = alltrue([
      for app_id in values(var.usfl_applications) :
      contains(try(data.msgraph_resource.main-apps.output.app_ids, []), app_id)
    ])
    error_message = "Not every application in var.usfl_applications is linked to user flow ${var.usfl_name}. Taint the msgraph_resource_action.main-app entry to re-link."
  }
}