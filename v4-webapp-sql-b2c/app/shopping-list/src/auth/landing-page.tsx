import { useState, type FormEvent } from "react"
import { ArrowRight, CalendarDays, Check, History, ShieldCheck, ShoppingBasket, Star } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

type LandingPageProps = {
  /** Start the External ID sign-in redirect. loginHint pre-fills the email on the hosted page. */
  onSignIn: (loginHint?: string) => void
  /** Same redirect, but straight to the sign-up screen (prompt=create). */
  onSignUp: (loginHint?: string) => void
  /** Message from a failed or cancelled redirect, shown above the buttons. */
  error?: string
}

const FEATURES = [
  { icon: CalendarDays, title: "Auto-created lists", body: "A fresh Sunday–Saturday list appears every week." },
  { icon: Star, title: "Favourites", body: "Save the staples and add them back in one tap." },
  { icon: History, title: "Full history", body: "Look back at every past week's order." },
] as const

/**
 * Signed-out face of the app. Deliberately collects no password: both buttons
 * hand off to the External ID hosted pages (<tenant>.ciamlogin.com), which own
 * credentials, sign-up attributes and MFA. The email box is only a login_hint.
 */
export function LandingPage({ onSignIn, onSignUp, error }: LandingPageProps) {
  const [email, setEmail] = useState("")

  function submit(e: FormEvent) {
    e.preventDefault()
    onSignIn(email)
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-[var(--border-ink)]">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="brand-mark">
              <ShoppingBasket className="size-[22px]" />
            </span>
            <div>
              <p className="eyebrow !m-0">Household shopping list</p>
              <p className="text-lg font-extrabold leading-tight m-0 tracking-tight">Shopping List</p>
            </div>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-10 md:py-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-x-16 items-start">
          <section className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1">
            <span className="chip self-start">
              <span className="size-[7px] rounded-full bg-[var(--status-delivered)]" />
              New list every Saturday at <span className="num">20:00</span>
            </span>
            <h1 className="m-0 text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight max-w-[620px]">
              The weekly shop, sorted before{" "}
              <span className="text-[var(--primary-strong)] dark:text-[var(--primary-ink)]">Sunday</span>.
            </h1>
            <p className="lede !m-0 text-base md:text-lg max-w-[560px]">
              Shopping List gives your household one shared list per week, Sunday to Saturday. Add items, pin your
              favourites for one-tap reuse, and follow each list from draft to doorstep.
            </p>
          </section>

          <section
            aria-labelledby="auth-title"
            className="card-styled !p-6 md:!p-8 flex flex-col gap-5 lg:col-start-2 lg:row-start-1 lg:row-span-2"
          >
            <div>
              <p className="eyebrow">Welcome</p>
              <h2 id="auth-title" className="m-0 text-2xl font-extrabold tracking-tight">
                Sign in to your list
              </h2>
              <p className="lede text-sm">Use your email to sign in, or create an account in under a minute.</p>
            </div>

            {error && (
              <p role="alert" className="m-0 text-sm rounded-[10px] border border-[var(--danger-ink)]/40 bg-[var(--danger-ink)]/10 px-3 py-2">
                {error}
              </p>
            )}

            <form onSubmit={submit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="landing-email" className="text-[13px] font-bold">
                  Email <span className="font-medium muted-text">(optional)</span>
                </label>
                <input
                  id="landing-email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-[10px] border border-[var(--border-ink)] bg-[var(--bg)] px-3.5 text-base outline-none focus-visible:border-[var(--primary-ink)] focus-visible:ring-[3px] focus-visible:ring-[var(--primary-ink)]/30"
                />
                <p className="m-0 text-xs muted-text">We pass this ahead so you don't have to type it twice.</p>
              </div>

              <button type="submit" className="btn-cyan h-12 flex items-center justify-center gap-2 text-[15px]">
                Sign in
                <ArrowRight className="size-4" />
              </button>
            </form>

            <div className="flex items-center gap-3 text-xs font-semibold muted-text">
              <span className="flex-1 h-px bg-[var(--border-ink)]" />
              New here?
              <span className="flex-1 h-px bg-[var(--border-ink)]" />
            </div>

            <button type="button" className="btn-ghost h-12 text-[15px]" onClick={() => onSignUp(email)}>
              Create an account
            </button>

            <div className="flex gap-2.5 items-start rounded-xl px-3.5 py-3 bg-[var(--primary-ink)]/10 border border-[var(--primary-ink)]/25">
              <ShieldCheck className="size-[18px] shrink-0 mt-px text-[var(--primary-strong)] dark:text-[var(--primary-ink)]" />
              <p className="m-0 text-[12.5px] leading-normal">
                You'll continue to a secure Microsoft Entra sign-in page. Shopping List never sees your password.
              </p>
            </div>
          </section>

          <section aria-label="Features" className="flex flex-col gap-5 lg:col-start-1 lg:row-start-2">
            <ul className="grid gap-3.5 sm:grid-cols-3 max-w-[640px] list-none p-0 m-0">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="list-tile !flex-col !items-start !justify-start gap-2">
                  <Icon className="size-5 text-[var(--primary-strong)] dark:text-[var(--primary-ink)]" />
                  <p className="m-0 text-sm font-bold">{title}</p>
                  <p className="m-0 text-[13px] muted-text">{body}</p>
                </li>
              ))}
            </ul>

            {/* Wrapper, not a class on the panel: .stepper-panel sets display itself. Too wide for phones. */}
            <div className="hidden sm:block">
              <div className="stepper-panel max-w-[640px]" aria-label="Every list moves from Draft to Ordered to Delivered">
                <div className="stepper">
                  <div className="step step--done">
                    <span className="step-dot"><Check className="size-3.5" strokeWidth={3} /></span>
                    <span className="step-name">Draft</span>
                  </div>
                  <span className="step-line is-filled" />
                  <div className="step step--current">
                    <span className="step-dot num text-xs font-bold">2</span>
                    <span className="step-name">Ordered</span>
                  </div>
                  <span className="step-line" />
                  <div className="step">
                    <span className="step-dot num text-xs font-bold">3</span>
                    <span className="step-name">Delivered</span>
                  </div>
                </div>
                <span className="status-badge status-badge--ordered">
                  <span className="dot" />
                  Ordered · read-only
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--border-ink)]">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-4 flex justify-between gap-4 flex-wrap text-xs muted-text">
          <span>
            Shopping List · <span className="num">v4</span>
          </span>
          <span>Secured by Microsoft Entra External ID</span>
        </div>
      </footer>
    </div>
  )
}
