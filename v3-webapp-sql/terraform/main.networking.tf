locals {

  vnet = {

    count = lookup(var.vnet_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} Spoke VNet"
    }
  }

  subnet = {

    count = lookup(var.subnet_count, terraform.workspace)
  }

  nsg = {

    count = lookup(var.nsg_count, terraform.workspace)

    tag_map = {
      1 = "${upper(local.prefix)} App Gateway Subnet NSG"
      2 = "${upper(local.prefix)} Web App Subnet NSG"
      3 = "${upper(local.prefix)} Function App Subnet NSG"
      4 = "${upper(local.prefix)} Logic App Subnet NSG"
      5 = "${upper(local.prefix)} Private Endpoint Subnet NSG"
    }
  }

  # Maps each subnet index to its role key in var.nsg_rules_by_role.
  nsg_role_by_index = ["appgw", "wapp", "fnap", "logic", "pe"]
}

variable "vnet_count" {
  description = "Number of virtual networks per environments"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    # spoke-vnet
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

variable "subnet_count" {
  description = "Number of subnets per environments"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 5,
    # 0 - vnet-spoke: snet-appgw
    # 1 - vnet-spoke: snet-wapp
    # 2 - vnet-spoke: snet-fnap
    # 3 - vnet-spoke: snet-logic
    # 4 - vnet-spoke: snet-pe
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

variable "nsg_count" {
  description = "Number of NSGs per environments"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 5,
    # 0 - snet-appgw
    # 1 - snet-wapp
    # 2 - snet-fnap
    # 3 - snet-logic
    # 4 - snet-pe
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

variable "nsg_rules_by_role" {
  description = <<-EOT
    NSG security rules keyed by subnet role (appgw, wapp, fnap, logic, pe).

    The explicit type below forces Terraform to *coerce* each rule object to a
    single shape - missing optional attributes become correctly-typed nulls.
    This avoids the strict tuple-to-list type inference that a per-index `?:`
    chain triggers, where a rule using `destination_port_ranges = [..]` cannot
    share an inferred list with a rule using `destination_port_range = "*"`.

    Notes:
      - Use `*_range` (singular) for "*" and service tags - lists reject those.
      - Use `*_ranges` / `*_prefixes` (plural) for multiple values or CIDR lists.
      - The logic and pe roles open 443 (storage), 445 (SMB content share) and
        20000-30000 (worker comms) - all three are required by the Logic App
        Standard runtime over VNet, or the host reports "Runtime version: Error".
  EOT

  type = map(list(object({
    name                                       = string
    priority                                   = number
    direction                                  = string
    access                                     = string
    protocol                                   = string
    source_port_range                          = optional(string)
    source_port_ranges                         = optional(list(string))
    destination_port_range                     = optional(string)
    destination_port_ranges                    = optional(list(string))
    source_address_prefix                      = optional(string)
    source_address_prefixes                    = optional(list(string))
    destination_address_prefix                 = optional(string)
    destination_address_prefixes               = optional(list(string))
    source_application_security_group_ids      = optional(list(string))
    destination_application_security_group_ids = optional(list(string))
    description                                = string
  })))

  default = {
    appgw = [
      {
        name                       = "AllowGatewayManager"
        priority                   = 100
        direction                  = "Inbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_ranges    = ["65200-65535"]
        source_address_prefix      = "GatewayManager"
        destination_address_prefix = "*"
        description                = "Allow gateway manager traffic into appgw subnet."
      },
      {
        name                       = "AllowInternetInbound"
        priority                   = 120
        direction                  = "Inbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_ranges    = ["80", "443"]
        source_address_prefix      = "Internet"
        destination_address_prefix = "VirtualNetwork"
        description                = "Allow internet traffic into appgw subnet."
      },
    ]

    wapp = [
      {
        name                       = "AllowAzureMonitor"
        priority                   = 100
        direction                  = "Outbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_range     = "443"
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "AzureMonitor"
        description                = "Allow azure monitor traffic out of subnet."
      },
      {
        name                       = "AllowPrivateEndpoints443"
        priority                   = 110
        direction                  = "Outbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_range     = "443"
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "172.16.10.0/24" # snet-pe
        description                = "Allow HTTPS to private endpoints."
      },
      {
        name                       = "DenyInternetOutbound"
        priority                   = 4000
        direction                  = "Outbound"
        access                     = "Deny"
        protocol                   = "*"
        source_port_range          = "*"
        destination_port_range     = "*"
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "Internet"
        description                = "Deny direct internet egress."
      },
    ]

    fnap = [
      {
        name                       = "AllowAzureMonitor"
        priority                   = 100
        direction                  = "Outbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_range     = "443"
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "AzureMonitor"
        description                = "Allow azure monitor traffic out of subnet."
      },
      {
        name                       = "AllowPrivateEndpoints443"
        priority                   = 110
        direction                  = "Outbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_range     = "443"
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "172.16.10.0/24" # snet-pe
        description                = "Allow HTTPS to private endpoints."
      },
      {
        name                       = "AllowSQLTraffic1433"
        priority                   = 120
        direction                  = "Outbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_range     = "1433"
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "172.16.10.0/24" # snet-pe
        description                = "Allow SQL to private endpoints."
      },
      {
        name                       = "DenyInternetOutbound"
        priority                   = 4000
        direction                  = "Outbound"
        access                     = "Deny"
        protocol                   = "*"
        source_port_range          = "*"
        destination_port_range     = "*"
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "Internet"
        description                = "Deny direct internet egress."
      },
    ]

    logic = [
      {
        name                       = "AllowAzureMonitor"
        priority                   = 100
        direction                  = "Outbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_range     = "443"
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "AzureMonitor"
        description                = "Allow azure monitor traffic out of subnet."
      },
      {
        name                       = "AllowStoragePrivateEndpoints"
        priority                   = 110
        direction                  = "Outbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_ranges    = ["443", "445", "20000-30000"]
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "172.16.10.0/24" # snet-pe
        description                = "Allow HTTPS (443), SMB file share (445), and worker comms (20000-30000) to private endpoints."
      },
      {
        name                       = "DenyInternetOutbound"
        priority                   = 4000
        direction                  = "Outbound"
        access                     = "Deny"
        protocol                   = "*"
        source_port_range          = "*"
        destination_port_range     = "*"
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "Internet"
        description                = "Deny direct internet egress."
      },
    ]

    pe = [
      {
        name                       = "AllowAppSubnetsToPrivateEndpoints"
        priority                   = 100
        direction                  = "Inbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_ranges    = ["443", "445", "1433", "20000-30000"]
        source_address_prefixes    = ["172.16.2.0/24", "172.16.4.0/24", "172.16.6.0/24", "172.16.8.0/24"] # appgw, wapp, fnap, logic
        destination_address_prefix = "VirtualNetwork"
        description                = "Allow HTTPS (443), SMB file share (445), SQL (1433), and worker comms (20000-30000) from app subnets to private endpoints."
      },
      {
        name                       = "DenyVnetInbound"
        priority                   = 4000
        direction                  = "Inbound"
        access                     = "Deny"
        protocol                   = "*"
        source_port_range          = "*"
        destination_port_range     = "*"
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "VirtualNetwork"
        description                = "Deny all other intra-VNet traffic to the PE subnet."
      },
    ]
  }
}

module "az-vnet" {
  source = "./modules/az-networking/az-vnet"

  shared = local.shared
  count  = local.vnet.count

  vnet_name = "${local.namingconstant}-spoke-${local.loc}-${format("%03d", count.index + 1)}"

  address_space = ["172.16.0.0/16"]

  log_analytics_workspace_id = module.az-core.loga_id

  tags = merge(local.default_tags,
    lookup(local.vnet.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.vnet.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null
  )
}

module "az-snet" {
  source = "./modules/az-networking/az-subnet"

  shared = local.shared
  count  = local.subnet.count

  subnet_name = count.index == 0 ? "${local.namingconstant}-snet-appgw-${local.loc}-${format("%03d", count.index + 1)}" : count.index == 1 ? "${local.namingconstant}-snet-wapp-${local.loc}-${format("%03d", count.index + 1)}" : count.index == 2 ? "${local.namingconstant}-snet-fnap-${local.loc}-${format("%03d", count.index + 1)}" : count.index == 3 ? "${local.namingconstant}-snet-logic-${local.loc}-${format("%03d", count.index + 1)}" : count.index == 4 ? "${local.namingconstant}-snet-pe-${local.loc}-${format("%03d", count.index + 1)}" : "${local.namingconstant}-snet-${local.loc}-${format("%03d", count.index + 1)}"

  virtual_network_name = module.az-vnet[0].vnet_name

  address_prefixes = count.index == 0 ? ["172.16.2.0/24"] : count.index == 1 ? ["172.16.4.0/24"] : count.index == 2 ? ["172.16.6.0/24"] : count.index == 3 ? ["172.16.8.0/24"] : count.index == 4 ? ["172.16.10.0/24"] : ["192.168.0.0/26"]

  delegations = count.index == 1 ? [
    {
      name = "wapp-delegation"
      service_delegation = {
        name = "Microsoft.Web/serverFarms"
        actions = [
          "Microsoft.Network/virtualNetworks/subnets/action"
        ]
      }
    }
    ] : count.index == 2 ? [
    {
      name = "fnap-delegation"
      service_delegation = {
        name = "Microsoft.App/environments"
        actions = [
          "Microsoft.Network/virtualNetworks/subnets/action"
        ]
      }
    }
    ] : count.index == 3 ? [
    {
      name = "logic-delegation"
      service_delegation = {
        name = "Microsoft.Web/serverFarms"
        actions = [
          "Microsoft.Network/virtualNetworks/subnets/action"
        ]
      }
    }
  ] : []

  private_endpoint_network_policies = count.index == 4 ? "Enabled" : "Disabled"

}

module "az-nsg" {
  source = "./modules/az-networking/az-nsg"

  shared = local.shared
  count  = local.nsg.count

  nsg_name = count.index == 0 ? "nsg-snet-appgw" : count.index == 1 ? "nsg-snet-wapp" : count.index == 2 ? "nsg-snet-fnap" : count.index == 3 ? "nsg-snet-logic" : count.index == 4 ? "nsg-snet-pe" : "slasql-nsg"

  nsg_rule = var.nsg_rules_by_role[local.nsg_role_by_index[count.index]]

  subnet_id = module.az-snet[count.index].subnet_id

  tags = merge(local.default_tags,
    lookup(local.nsg.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.nsg.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null
  )

}
