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
      2 = "${upper(local.prefix)} Container Apps Environment Subnet NSG"
      3 = "${upper(local.prefix)} Function App Subnet NSG"
      4 = "${upper(local.prefix)} Logic App Subnet NSG"
      5 = "${upper(local.prefix)} Private Endpoint Subnet NSG"
    }
  }

  # Maps each subnet index to its role key in var.nsg_rules_by_role.
  nsg_role_by_index = ["appgw", "cae", "fnap", "logic", "pe"]

  # Subnet IDs by role, e.g. local.snet_id["pe"]. Reference subnets through this rather
  # than module.az-snet[n], so a reordered subnet list can't silently move a resource
  # into the wrong subnet (risk R12). Built from the module instances, so it is simply
  # empty in workspaces with no subnets.
  snet_id = { for i, s in module.az-snet : local.nsg_role_by_index[i] => s.subnet_id }
}

variable "vnet_count" {
  description = "Number of virtual networks per environments"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    # spoke-vnet
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-uks" = 0
  }

}

variable "subnet_count" {
  description = "Number of subnets per environments"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 5,
    # 0 - vnet-spoke: snet-appgw
    # 1 - vnet-spoke: snet-cae (Container Apps environment)
    # 2 - vnet-spoke: snet-fnap
    # 3 - vnet-spoke: snet-logic
    # 4 - vnet-spoke: snet-pe
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-uks" = 0
  }

}

variable "nsg_count" {
  description = "Number of NSGs per environments"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 5,
    # 0 - snet-appgw
    # 1 - snet-cae
    # 2 - snet-fnap
    # 3 - snet-logic
    # 4 - snet-pe
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-uks" = 0
  }

}

variable "nsg_rules_by_role" {
  description = <<-EOT
    NSG security rules keyed by subnet role (appgw, cae, fnap, logic, pe).

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
      - The cae role follows "Securing a virtual network in Azure Container
        Apps" (workload profiles). An NSG rule takes one service tag, so the
        platform dependencies are one rule each. If the environment fails to
        provision, disable DenyInternetOutbound, confirm, then re-enable it
        (plan section 11.2, risk R7).
      - SQL (1433) into the pe subnet is allowed from fnap only - the web
        container never talks to SQL directly (plan section 5).
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

    cae = [
      # Inbound
      {
        name                       = "AllowAppGwToCae"
        priority                   = 100
        direction                  = "Inbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_ranges    = ["80", "443"]
        source_address_prefix      = "172.16.2.0/24" # snet-appgw
        destination_address_prefix = "172.16.4.0/24" # snet-cae
        description                = "Allow App Gateway to reach the environment's internal load balancer."
      },
      {
        name                       = "AllowAzureLoadBalancer"
        priority                   = 110
        direction                  = "Inbound"
        access                     = "Allow"
        protocol                   = "*"
        source_port_range          = "*"
        destination_port_range     = "*"
        source_address_prefix      = "AzureLoadBalancer"
        destination_address_prefix = "*"
        description                = "Allow Azure Load Balancer health probes into the environment."
      },
      {
        name                       = "AllowIntraSubnetInbound"
        priority                   = 120
        direction                  = "Inbound"
        access                     = "Allow"
        protocol                   = "*"
        source_port_range          = "*"
        destination_port_range     = "*"
        source_address_prefix      = "172.16.4.0/24" # snet-cae
        destination_address_prefix = "172.16.4.0/24" # snet-cae
        description                = "Allow traffic between environment nodes."
      },
      # Outbound
      {
        name                       = "AllowIntraSubnetOutbound"
        priority                   = 100
        direction                  = "Outbound"
        access                     = "Allow"
        protocol                   = "*"
        source_port_range          = "*"
        destination_port_range     = "*"
        source_address_prefix      = "172.16.4.0/24" # snet-cae
        destination_address_prefix = "172.16.4.0/24" # snet-cae
        description                = "Allow traffic between environment nodes."
      },
      {
        name                       = "AllowToPe"
        priority                   = 110
        direction                  = "Outbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_range     = "443"
        source_address_prefix      = "172.16.4.0/24"  # snet-cae
        destination_address_prefix = "172.16.10.0/24" # snet-pe
        description                = "Allow HTTPS to private endpoints (Function App, ACR)."
      },
      {
        name                       = "AllowMicrosoftContainerRegistry"
        priority                   = 120
        direction                  = "Outbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_range     = "443"
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "MicrosoftContainerRegistry"
        description                = "Allow pulls of the environment's system container images."
      },
      {
        name                       = "AllowAzureFrontDoorFirstParty"
        priority                   = 130
        direction                  = "Outbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_range     = "443"
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "AzureFrontDoor.FirstParty"
        description                = "Allow MCR's content delivery dependency."
      },
      {
        name                       = "AllowAzureActiveDirectory"
        priority                   = 140
        direction                  = "Outbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_range     = "443"
        source_address_prefix      = "VirtualNetwork"
        destination_address_prefix = "AzureActiveDirectory"
        description                = "Allow managed identity token requests (ACR pull)."
      },
      {
        name                       = "AllowAzureMonitor"
        priority                   = 150
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
        name                       = "AllowSqlPe"
        priority                   = 120
        direction                  = "Outbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_range     = "1433"
        source_address_prefix      = "172.16.6.0/24"  # snet-fnap
        destination_address_prefix = "172.16.10.0/24" # snet-pe
        description                = "Allow TDS to the SQL private endpoint."
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
        destination_port_ranges    = ["443", "445", "20000-30000"]
        source_address_prefixes    = ["172.16.2.0/24", "172.16.4.0/24", "172.16.6.0/24", "172.16.8.0/24"] # appgw, cae, fnap, logic
        destination_address_prefix = "VirtualNetwork"
        description                = "Allow HTTPS (443), SMB file share (445), and worker comms (20000-30000) from app subnets to private endpoints."
      },
      {
        name                       = "AllowFunctionToSql"
        priority                   = 110
        direction                  = "Inbound"
        access                     = "Allow"
        protocol                   = "Tcp"
        source_port_range          = "*"
        destination_port_range     = "1433"
        source_address_prefix      = "172.16.6.0/24" # snet-fnap
        destination_address_prefix = "VirtualNetwork"
        description                = "Allow TDS from the Function App to the SQL private endpoint."
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

  subnet_name = count.index == 0 ? "${local.namingconstant}-snet-appgw-${local.loc}-${format("%03d", count.index + 1)}" : count.index == 1 ? "${local.namingconstant}-snet-cae-${local.loc}-${format("%03d", count.index + 1)}" : count.index == 2 ? "${local.namingconstant}-snet-fnap-${local.loc}-${format("%03d", count.index + 1)}" : count.index == 3 ? "${local.namingconstant}-snet-logic-${local.loc}-${format("%03d", count.index + 1)}" : count.index == 4 ? "${local.namingconstant}-snet-pe-${local.loc}-${format("%03d", count.index + 1)}" : "${local.namingconstant}-snet-${local.loc}-${format("%03d", count.index + 1)}"

  virtual_network_name = module.az-vnet[0].vnet_name

  address_prefixes = count.index == 0 ? ["172.16.2.0/24"] : count.index == 1 ? ["172.16.4.0/24"] : count.index == 2 ? ["172.16.6.0/24"] : count.index == 3 ? ["172.16.8.0/24"] : count.index == 4 ? ["172.16.10.0/24"] : ["192.168.0.0/26"]

  delegations = count.index == 1 ? [
    {
      name = "cae-delegation"
      service_delegation = {
        name = "Microsoft.App/environments"
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

  nsg_name = count.index == 0 ? "nsg-snet-appgw" : count.index == 1 ? "nsg-snet-cae" : count.index == 2 ? "nsg-snet-fnap" : count.index == 3 ? "nsg-snet-logic" : count.index == 4 ? "nsg-snet-pe" : "${local.prefix}-nsg"

  nsg_rule = var.nsg_rules_by_role[local.nsg_role_by_index[count.index]]

  subnet_id = module.az-snet[count.index].subnet_id

  tags = merge(local.default_tags,
    lookup(local.nsg.tag_map, "${count.index + 1}", "") != "" ? ({
      "Purpose"       = lookup(local.nsg.tag_map, "${count.index + 1}", "")
      "Resource Name" = format("%s", local.shared.resg.name)
    }) : null
  )

}
