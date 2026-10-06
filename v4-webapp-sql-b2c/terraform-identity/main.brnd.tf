locals {
  brnd = {

    count = lookup(var.brnd_count, terraform.workspace)

    # Matches the SPA: dark theme --bg (app/shopping-list/src/index.css)
    background_color = "#0b172a"
    sign_in_text     = "Your household's weekly shopping list. Sign in, or create an account to get started."

    # Rendered by tools/brand-assets/render.mjs from the app's brand mark
    images = {
      bannerLogo = "${path.root}/branding/banner-logo.png"
      squareLogo = "${path.root}/branding/square-logo.png"
      favicon    = "${path.root}/branding/favicon.png"
    }
  }
}

variable "brnd_count" {
  description = "Company branding (sign-in page look and feel) per environment - 0 or 1, it is a tenant singleton"
  default = {
    "dv-uks" = 0,
    "dv-ukw" = 1,
    "ts-uks" = 0,
    "pp-uks" = 0
    "pa-ukw" = 0
  }

}

# Company branding for the hosted sign-in / sign-up pages, so the hop from the
# landing page to <tenant>.ciamlogin.com keeps the app's look.
module "az-brnd" {
  source = "./modules/az-brnd"

  shared = local.shared
  count  = local.brnd.count

  ciam_client_id     = var.ciam_client_id
  ciam_client_secret = var.ciam_client_secret

  background_color = local.brnd.background_color
  sign_in_text     = local.brnd.sign_in_text
  images           = local.brnd.images

}
