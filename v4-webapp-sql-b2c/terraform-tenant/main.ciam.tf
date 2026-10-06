locals {
  ciam = {

    count = lookup(var.ciam_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} External ID Tenant"
    }
  }
}

variable "ciam_count" {
  description = "Number of External ID (CIAM) tenants per environment"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

module "az-ciam" {
  source = "./modules/az-ciam"

  shared = local.shared
  count  = local.ciam.count

   # One tenant per environment, so no count index in the domain. Globally unique, not reusable after delete.
  ciam_domain_prefix = "${local.prefix}${local.env_long}"
  ciam_display_name  = "${upper(local.prefix)} ${upper(local.env)} External ID"
  ciam_location      = "Europe" # a data-residency geo, NOT an Azure region. Immutable.
  ciam_country_code  = "GB"
  ciam_sku_name      = "Standard"
  ciam_sku_tier      = "A0"

  tags = merge(local.default_tags,
    lookup(local.ciam.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.ciam.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null

  )


}