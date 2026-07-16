import { Link } from "react-router-dom"
import { ShoppingBasket } from "lucide-react"

export default function NotFoundPage() {
  return (
    <div className="min-h-full grid place-items-center">
      <div className="card-styled w-full max-w-md text-center flex flex-col items-center gap-4 py-10 rise-in">
        <span className="empty-hero-icon">
          <ShoppingBasket className="size-7" />
        </span>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight m-0 text-gradient">
          404 – Not found
        </h1>
        <p className="muted-text m-0">This isn't the page you're looking for.</p>
        <Link to="/" className="btn-cyan no-underline">
          Go home
        </Link>
      </div>
    </div>
  )
}
