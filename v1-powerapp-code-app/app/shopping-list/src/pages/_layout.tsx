import { Outlet, NavLink } from "react-router-dom"
import { History, ListChecks, ShoppingBasket, Star } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

type LayoutProps = { showHeader?: boolean }

const NAV_ITEMS = [
  { to: "/", label: "Current", end: true, icon: ListChecks },
  { to: "/history", label: "History", end: false, icon: History },
  { to: "/favourites", label: "Favourites", end: false, icon: Star },
] as const

export default function Layout({ showHeader = true }: LayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col">
      {showHeader && (
        <header className="app-header">
          <div className="mx-auto w-full max-w-[1200px] px-5 py-3.5 flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="brand-badge">
                <ShoppingBasket className="size-5" />
              </span>
              <div>
                <p className="eyebrow !m-0">Household shopping list</p>
                <h1 className="text-lg font-extrabold leading-tight m-0 text-gradient">
                  Shopping List
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-1 rounded-xl border border-[var(--border-ink)] bg-[var(--tile-bg)] p-1">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-[rgba(61,179,255,0.14)] text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--primary-strong)]"
                          : "text-[var(--muted-ink)] hover:text-[var(--ink)] hover:bg-[rgba(61,179,255,0.06)]"
                      }`
                    }
                  >
                    <item.icon className="size-4" />
                    <span className="hidden sm:inline">{item.label}</span>
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
