resource "azurerm_virtual_network_peering" "hub-to-spoke" {
  name                      = var.hub_to_spoke_peering_name
  resource_group_name       = var.shared.resg.name
  virtual_network_name      = var.hub_to_spoke_hub_vnet_name
  remote_virtual_network_id = var.hub_to_spoke_spoke_vnet_id

  allow_virtual_network_access           = var.hub_to_spoke_allow_virtual_network_access
  allow_forwarded_traffic                = var.hub_to_spoke_allow_forwarded_traffic
  allow_gateway_transit                  = var.hub_to_spoke_allow_gateway_transit
  local_subnet_names                     = var.hub_to_spoke_local_subnet_names
  only_ipv6_peering_enabled              = var.hub_to_spoke_only_ipv6_peering_enabled
  peer_complete_virtual_networks_enabled = var.hub_to_spoke_peer_complete_virtual_networks_enabled
  remote_subnet_names                    = var.hub_to_spoke_remote_subnet_names
  use_remote_gateways                    = var.hub_to_spoke_use_remote_gateways
}

resource "azurerm_virtual_network_peering" "spoke-to-hub" {
  name                      = var.spoke_to_hub_peering_name
  resource_group_name       = var.shared.resg.name
  virtual_network_name      = var.spoke_to_hub_spoke_vnet_name
  remote_virtual_network_id = var.spoke_to_hub_hub_vnet_id

  allow_virtual_network_access           = var.spoke_to_hub_allow_virtual_network_access
  allow_forwarded_traffic                = var.spoke_to_hub_allow_forwarded_traffic
  allow_gateway_transit                  = var.spoke_to_hub_allow_gateway_transit
  local_subnet_names                     = var.spoke_to_hub_local_subnet_names
  only_ipv6_peering_enabled              = var.spoke_to_hub_only_ipv6_peering_enabled
  peer_complete_virtual_networks_enabled = var.spoke_to_hub_peer_complete_virtual_networks_enabled
  remote_subnet_names                    = var.spoke_to_hub_remote_subnet_names
  use_remote_gateways                    = var.spoke_to_hub_use_remote_gateways
}