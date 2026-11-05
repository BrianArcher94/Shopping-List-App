resource "azurerm_container_app_environment" "main" {
  name                       = var.ce_name
  location                   = var.shared.resg.location
  resource_group_name        = var.shared.resg.name
  logs_destination           = "log-analytics"
  log_analytics_workspace_id = var.log_analytics_workspace_id

  # Workload-profiles environment on the Consumption profile only (no dedicated
  # profiles, so no fixed cost). Needs a subnet delegated to Microsoft.App/environments.
  infrastructure_subnet_id = var.infrastructure_subnet_id

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  # Internal: the environment gets a private static IP in the subnet and no public
  # endpoint. App Gateway reaches it through the default-domain private DNS zone.
  internal_load_balancer_enabled = var.internal_load_balancer_enabled

  # Immutable. Named explicitly so Azure doesn't generate an ME_... resource group.
  infrastructure_resource_group_name = var.infrastructure_resource_group_name

  tags = var.tags

}
