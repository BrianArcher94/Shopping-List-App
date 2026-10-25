output "private_dns_zones" {
  description = "Private DNS zones keyed by zone name"
  value = {
    for zone_name, zone in azurerm_private_dns_zone.main :
    zone_name => {
      id   = zone.id
      name = zone.name
    }
  }
}