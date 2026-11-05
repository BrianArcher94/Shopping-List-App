resource "azurerm_container_app" "main" {
  name                         = var.ca_name
  resource_group_name          = var.shared.resg.name
  container_app_environment_id = var.environment_id
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"

  identity {
    type         = "UserAssigned"
    identity_ids = [var.uami_id]
  }

  # Image pulls authenticate as the UAMI (AcrPull) - no admin credentials or secrets.
  registry {
    server   = var.registry_server
    identity = var.uami_id
  }

  # Key Vault references, read by the UAMI (Key Vault Secrets User). Nothing secret is
  # held in state or in the template.
  dynamic "secret" {
    for_each = var.key_vault_secrets
    content {
      name                = secret.key
      key_vault_secret_id = secret.value
      identity            = var.uami_id
    }
  }

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name   = var.container_name
      image  = var.image
      cpu    = var.cpu
      memory = var.memory

      dynamic "env" {
        for_each = var.env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secret_env
        content {
          name        = env.key
          secret_name = env.value
        }
      }

      # All probes hit an endpoint that doesn't depend on downstream services, so a cold
      # backend can't take the app out of rotation or get it restarted.
      startup_probe {
        transport               = "HTTP"
        port                    = var.target_port
        path                    = var.health_path
        interval_seconds        = 5
        timeout                 = 3
        failure_count_threshold = 12
      }

      readiness_probe {
        transport               = "HTTP"
        port                    = var.target_port
        path                    = var.health_path
        interval_seconds        = 10
        timeout                 = 3
        failure_count_threshold = 3
        success_count_threshold = 1
      }

      liveness_probe {
        transport               = "HTTP"
        port                    = var.target_port
        path                    = var.health_path
        interval_seconds        = 30
        timeout                 = 5
        failure_count_threshold = 3
      }
    }

    http_scale_rule {
      name                = "http-concurrency"
      concurrent_requests = tostring(var.http_concurrency)
    }
  }

  # In an internal (ILB) environment, external_enabled means reachable from the VNet,
  # not from the internet.
  ingress {
    external_enabled           = var.external_enabled
    target_port                = var.target_port
    transport                  = "auto"
    allow_insecure_connections = false

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = var.tags

  # The app pipeline owns the image tag (az containerapp update --image); Terraform only
  # sets the initial one (plan D3).
  lifecycle {
    ignore_changes = [template[0].container[0].image]
  }

}
