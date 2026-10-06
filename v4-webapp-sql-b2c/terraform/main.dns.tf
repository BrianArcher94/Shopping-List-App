module "az-dns" {
  source = "./modules/az-dns"

  shared = local.shared

  dns_zones = [
    "privatelink.file.core.windows.net",
    "privatelink.blob.core.windows.net",
    "privatelink.queue.core.windows.net",
    "privatelink.azurewebsites.net",
    "privatelink.vaultcore.azure.net",
    "privatelink.database.windows.net"
  ]

  spoke_vnet_id = module.az-vnet[0].vnet_id
}