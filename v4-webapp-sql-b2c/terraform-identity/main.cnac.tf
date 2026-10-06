locals {
  cnac = {

    count = lookup(var.cnac_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} Require MFA for the Shopping List SPA"
    }
  }
}

variable "cnac_count" {
  description = "Number of Conditional Access policies per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

# -----------------------------------------------------------------------------
# Conditional Access - require MFA for every user signing in to the SPA.
# Scoped to the SPA app registration, not "All resources".
# -----------------------------------------------------------------------------
resource "azuread_conditional_access_policy" "main" {
  count = local.cnac.count

  display_name = "${local.namingconstant}-cnac-${local.loc}-${format("%03d", count.index + 1)}"
  state        = var.cnac_state

  conditions {
    client_app_types = ["all"]

    applications {
      included_applications = [module.az-appr-spa[count.index].appr_client_id]
    }

    users {
      included_users = ["All"]
      excluded_users = var.cnac_excluded_user_ids
    }
  }

  grant_controls {
    operator          = "OR"
    built_in_controls = ["mfa"]
  }

  lifecycle {
    # Refuse to enforce with nobody excluded.
    precondition {
      condition     = var.cnac_state != "enabled" || length(var.cnac_excluded_user_ids) > 0
      error_message = "cnac_state = enabled requires at least one excluded (break-glass) user in cnac_excluded_user_ids."
    }
  }

  depends_on = [msgraph_resource_action.aume-email, time_sleep.appr_propagation]
}