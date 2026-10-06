import { Outlet, NavLink } from "react-router-dom"
import { ShoppingBasket } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

type LayoutProps = { showHeader?: boolean }

const NAV_ITEMS = [
  { to: "/", label: "Current", end: true },
  { to: "/history", label: "History", end: false },
  { to: "/favourites", label: "Favourites", end: false },
] as const

export default function Layout({ showHeader = true }: LayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col">
      {showHeader && (
        <header className="sticky top-0 z-50 border-b border-[var(--border-ink)] backdrop-blur-md bg-[color-mix(in_srgb,var(--bg)_78%,transparent)]">
          <div className="mx-auto w-full max-w-[1200px] px-5 py-4 flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="brand-mark">
                <ShoppingBasket className="size-[22px]" />
              </span>
              <div>
                <p className="eyebrow !m-0">Household shopping list</p>
                <h1 className="text-lg font-extrabold leading-tight m-0 tracking-tight">Shopping List</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <nav className="seg-nav">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `seg-nav__item ${isActive ? "is-active" : ""}`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <ModeToggle />
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 flex">
        <div className="flex-1 mx-auto w-full max-w-[1200px] px-5 py-8 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
