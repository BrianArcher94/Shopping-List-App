# Company branding (Graph: organizationalBranding, default locale "0").
#
# NOT msgraph_resource: branding is a tenant singleton that is PATCHed, never POSTed,
# and the logos are binary Stream properties that Graph only accepts as a raw
# `PUT .../bannerLogo` with an image/* body - the msgraph provider sends JSON only.
# So the branding is applied by set-branding.ps1 (Invoke-RestMethod, client
# credentials as the bootstrap SP) and re-run whenever an input changes.
#
# Trade-offs: no drift detection (an edit in the portal is not seen by plan), and
# destroy leaves the branding in place - it is cosmetic and harmless to keep.
resource "terraform_data" "main" {
  triggers_replace = {
    tenant_id        = var.shared.ciam.tenant_id
    background_color = var.background_color
    sign_in_text     = var.sign_in_text
    script           = filesha256("${path.module}/set-branding.ps1")
    images           = { for k, p in var.images : k => filesha256(p) }
  }

  provisioner "local-exec" {
    interpreter = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File"]
    command     = "${path.module}/set-branding.ps1"

    environment = {
      BRND_TENANT_ID        = var.shared.ciam.tenant_id
      BRND_CLIENT_ID        = var.ciam_client_id
      BRND_CLIENT_SECRET    = var.ciam_client_secret
      BRND_BACKGROUND_COLOR = var.background_color
      BRND_SIGN_IN_TEXT     = var.sign_in_text
      # "bannerLogo=C:\...\banner-logo.png;favicon=..." - paths resolved here so the script needs no cwd
      BRND_IMAGES = join(";", [for k, p in var.images : "${k}=${abspath(p)}"])
    }
  }
}
