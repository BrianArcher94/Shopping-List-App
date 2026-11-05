import { Outlet, NavLink } from "react-router-dom"
import { ModeToggle } from "@/components/mode-toggle"

type LayoutProps = { showHeader?: boolean }

const NAV_ITEMS = [
  { to: "/", label: "This week", end: true },
  { to: "/history", label: "History", end: false },
  { to: "/favourites", label: "Favourites", end: false },
] as const

export default function Layout({ showHeader = true }: LayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col">
      {showHeader && (
        <header className="mx-auto w-full max-w-[1180px] px-5 md:px-7 py-5 flex items-center justify-between gap-5 flex-wrap">
          <NavLink to="/" className="display text-[28px] md:text-[34px] no-underline">
            Weekly Shop <span className="text-[var(--accent)]">&amp; Co.</span>
          </NavLink>
          <div className="flex items-center gap-3">
            <nav aria-label="Main" className="hidden md:flex gap-1.5">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-tab ${isActive ? "is-active" : ""}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <ModeToggle />
          </div>
        </header>
      )}

      <main className="flex-1 mx-auto w-full max-w-[1180px] px-4 md:px-7 pt-2 pb-28 md:pb-16">
        <Outlet />
      </main>

      {showHeader && (
        <nav
          aria-label="Main"
          className="md:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 bg-[var(--paper)] border-t border-[var(--rule)] px-2 pb-[max(12px,env(safe-area-inset-bottom))]"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `tabbar-tab ${isActive ? "is-active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
