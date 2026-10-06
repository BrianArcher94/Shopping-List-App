locals {
  usfl = {

    count = lookup(var.usfl_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} Sign up and sign in"
    }
  }
}

variable "usfl_count" {
  description = "Number of user flows per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

module "az-usfl" {
  source = "./modules/az-usfl"

  shared = local.shared
  count  = local.usfl.count

  usfl_name        = "${local.namingconstant}-usfl-${local.loc}-${format("%03d", count.index + 1)}"
  usfl_description = "Deployed By Terraform | ${lookup(local.usfl.tag_map, "${count.index + 1}", "")}"

  sign_up_allowed       = true
  identity_provider_ids = ["EmailPassword-OAUTH"]

  # email is mandatory and hidden (it is the sign-in name); displayName becomes the "name" claim
  # and therefore CreatedByName in the database.
  attributes = [
    { id = "email", label = "Email Address", required = true, editable = false, hidden = true },
    { id = "displayName", label = "Display Name", required = true, editable = true, hidden = false },
  ]

  usfl_applications = {
    spa = module.az-appr-spa[count.index].appr_client_id
  }

  depends_on = [time_sleep.appr_propagation]

}