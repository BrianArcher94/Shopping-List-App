# Microsoft Entra External ID tenant.
# azurerm has no resource for this type, so it is created through azapi.
# https://learn.microsoft.com/en-us/azure/templates/microsoft.azureactivedirectory/ciamdirectories?pivots=deployment-language-terraform

resource "azapi_resource" "main" {
  type      = "Microsoft.AzureActiveDirectory/ciamDirectories@2023-05-17-preview"
  name      = "${var.ciam_domain_prefix}.onmicrosoft.com"
  parent_id = var.shared.resg.id
  location  = var.ciam_location

  body = {
    sku = {
      name = var.ciam_sku_name
      tier = var.ciam_sku_tier
    }
    properties = {
      createTenantProperties = {
        displayName = var.ciam_display_name
        countryCode = var.ciam_country_code
      }
    }
  }

  response_export_values = ["properties.tenantId", "properties.domainName"]

  tags = var.tags

  timeouts {
    create = "60m"
  }

  lifecycle {
    # Deleting the ARM resource deletes the directory and burns the domain name.
    prevent_destroy = true
    # createTenantProperties is write-only (never returned on read) and immutable after create.
    ignore_changes = [body]
  }
}