locals {
  stra = {

    count = lookup(var.stra_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} BA Testing"
    }
  }
}

variable "stra_count" {
  description = "Number of storage accounts per environments"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

module "az-stra" {
  source = "./modules/az-stra"

  shared = local.shared
  count  = local.stra.count

  storage_account_name = "${local.prefix}${local.env}stra${local.loc}00${count.index + 1}"

  account_kind = "StorageV2"

  sku_name = local.env == "pa" ? "Standard_RAGRS" : "Standard_LRS"

  enable_advanced_threat_protection = false

  pe_subnet_id = module.az-snet[4].subnet_id

  blob_dns_zone  = module.az-dns.private_dns_zones["privatelink.blob.core.windows.net"].id
  file_dns_zone  = module.az-dns.private_dns_zones["privatelink.file.core.windows.net"].id
  queue_dns_zone = module.az-dns.private_dns_zones["privatelink.queue.core.windows.net"].id

  stra_network_rules_enabled = true

  bypass_allowed_azure_services = ["AzureServices"]

  # Containers
  containers_list = ([

    {
      name        = "fnap-data",
      access_type = "container"
    }
  ])

  # File shares
  file_shares = [
    {
      name  = "logic-app-data"
      quota = 50
    }
  ]

  is_used_for_lgaps = true

  log_analytics_workspace_id = module.az-core.loga_id

  tags = merge(local.default_tags,
    lookup(local.stra.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.stra.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null

  )

}