import { createBrowserRouter } from "react-router-dom"
import Layout from "@/pages/_layout"
import CurrentListPage from "@/pages/current-list"
import HistoryPage from "@/pages/history"
import FavouritesPage from "@/pages/favourites"
import ListDetailPage from "@/pages/list-detail"
import NotFoundPage from "@/pages/not-found"
import ProfilePage from "@/pages/profile"

// IMPORTANT: Do not remove or modify the code below!
// Normalize basename when hosted in Power Apps
const BASENAME = new URL(".", location.href).pathname
if (location.pathname.endsWith("/index.html")) {
  history.replaceState(null, "", BASENAME + location.search + location.hash);
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <CurrentListPage /> },
      { path: "list/:id", element: <ListDetailPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "favourites", element: <FavouritesPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
], {
  basename: BASENAME // IMPORTANT: Set basename for proper routing when hosted in Power Apps
})
