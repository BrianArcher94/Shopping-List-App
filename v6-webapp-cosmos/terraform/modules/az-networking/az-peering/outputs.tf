output "hub_to_spoke_id" {
  value = azurerm_virtual_network_peering.hub-to-spoke.id
}

output "spoke_to_hub_id" {
  value = azurerm_virtual_network_peering.spoke-to-hub.id

}