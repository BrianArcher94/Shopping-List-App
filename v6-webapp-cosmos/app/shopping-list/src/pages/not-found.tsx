import { Link } from "react-router-dom"

export default function NotFoundPage() {
  return (
    <div className="min-h-full grid place-items-center px-6">
      <div className="text-center flex flex-col items-center gap-4">
        <p className="mono m-0 text-sm muted-text">ERROR 404</p>
        <h1 className="display m-0 text-6xl">Not on the receipt</h1>
        <p className="m-0 muted-text">This isn't the page you're looking for.</p>
        <Link to="/" className="btn-solid no-underline">Back to this week</Link>
      </div>
    </div>
  )
}
