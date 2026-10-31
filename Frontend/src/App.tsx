import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useParams,
} from "react-router-dom";
import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { Click } from "@animate-ui/react/primitives/effects/click";
import { useAuthStore } from "./store/authStore";
import { useClickAnimationStore } from "./store/clickAnimationStore";
import { AuthenticatedLayout } from "./components/layout/AuthenticatedLayout";
import { LoginPage } from "./pages/login/LoginPage";
import { RegisterPage } from "./pages/register/RegisterPage";
import { HomePage } from "./pages/home/HomePage";
import { ErrorPage } from "./pages/ErrorPage";
import { Spinner } from "./components/ui/Status";
import { ThemeProvider } from "./context/ThemeContext";
import { LocaleProvider } from "./context/LocaleContext";
import { ToastProvider } from "./components/ui";

const GalleryPage = lazy(() => import("./pages/gallery/GalleryPage").then((module) => ({ default: module.GalleryPage })));
const TrashPage = lazy(() => import("./pages/gallery/TrashPage").then((module) => ({ default: module.TrashPage })));
const AlbumsPage = lazy(() => import("./pages/albums/AlbumsPage").then((module) => ({ default: module.AlbumsPage })));
const AlbumPage = lazy(() => import("./pages/albums/AlbumPage").then((module) => ({ default: module.AlbumPage })));
const UsersPage = lazy(() => import("./pages/users/UsersPage").then((module) => ({ default: module.UsersPage })));
const LocationsPage = lazy(() => import("./pages/locations/LocationsPage").then((module) => ({ default: module.LocationsPage })));
const FoodPage = lazy(() => import("./pages/food/FoodPage").then((module) => ({ default: module.FoodPage })));
const UploadManagementPage = lazy(() => import("./pages/uploads/UploadManagementPage").then((module) => ({ default: module.UploadManagementPage })));
const DownloadManagementPage = lazy(() => import("./pages/downloads/DownloadManagementPage").then((module) => ({ default: module.DownloadManagementPage })));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage").then((module) => ({ default: module.ProfilePage })));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false } },
});

/** / is the protected Home page; unauthenticated visitors land on /login or /register. */
const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <ErrorPage />,
    children: [
      {
        errorElement: <ErrorPage />,
        element: (
          <RequireAuth>
            <AuthenticatedLayout />
          </RequireAuth>
        ),
        children: [
          { path: "/", element: <HomePage /> },
          { path: "/library/gallery", element: <GalleryPage key="pictures" view="pictures" /> },
          { path: "/library/gallery/videos", element: <GalleryPage key="videos" view="pictures" initialFilter="video" /> },
          { path: "/library/gallery/favorites", element: <GalleryPage key="favorites" view="favorites" /> },
          {
            path: "/library/gallery/trash",
            element: (
              <RequireAdmin>
                <TrashPage />
              </RequireAdmin>
            ),
          },
          { path: "/library/album", element: <AlbumsPage /> },
          { path: "/library/album/:albumId", element: <AlbumPage /> },
          { path: "/gallery", element: <Navigate replace to="/library/gallery" /> },
          { path: "/gallery/videos", element: <Navigate replace to="/library/gallery/videos" /> },
          { path: "/gallery/favorites", element: <Navigate replace to="/library/gallery/favorites" /> },
          { path: "/gallery/trash", element: <Navigate replace to="/library/gallery/trash" /> },
          { path: "/albums", element: <Navigate replace to="/library/album" /> },
          { path: "/albums/:albumId", element: <LegacyAlbumRedirect /> },
          { path: "/saved", element: <LegacyAlbumRedirect /> },
          { path: "/saved/:albumId", element: <LegacyAlbumRedirect /> },
          { path: "/sync/upload", element: <UploadManagementPage /> },
          { path: "/sync/download", element: <DownloadManagementPage /> },
          { path: "/location/travel", element: <LocationsPage /> },
          { path: "/location/food", element: <FoodPage /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "/uploads", element: <Navigate replace to="/sync/upload" /> },
          { path: "/uploads/new", element: <Navigate replace to="/sync/upload" /> },
          { path: "/locations", element: <Navigate replace to="/location/travel" /> },
          { path: "/food", element: <Navigate replace to="/location/food" /> },
          { path: "/users", element: <UsersPage /> },
          { path: "/admin/users", element: <Navigate replace to="/users" /> },
        ],
      },
      {
        element: <Outlet />,
        children: [
          { path: "/login", element: <LoginPage />, errorElement: <ErrorPage /> },
          { path: "/register", element: <RegisterPage />, errorElement: <ErrorPage /> },
        ],
      },
      { path: "*", element: <Navigate replace to="/" /> },
    ],
  },
], {
  future: { v7_relativeSplatPath: true },
});

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  return token ? children : <Navigate to="/login" replace />;
}

/** Session must carry the admin role; non-admins fall back to Home. */
function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user?.role?.toLowerCase() === "admin" ? children : <Navigate to="/" replace />;
}

function LegacyAlbumRedirect() {
  const { albumId } = useParams<{ albumId: string }>();
  return <Navigate replace to={albumId ? `/library/album/${albumId}` : "/library/album"} />;
}

export function App() {
  const clickAnimation = useClickAnimationStore((state) => state.effect);

  useEffect(() => {
    const preventTouchContextMenu = (event: MouseEvent) => {
      if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", preventTouchContextMenu);
    return () => document.removeEventListener("contextmenu", preventTouchContextMenu);
  }, []);

  return (
    <ThemeProvider>
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>
          <AnimateUIProvider tempo={1}>
            <ToastProvider>
              {clickAnimation === "ripple" ? (
                <Click variant="ripple" color="var(--accent-strong)" size={100} duration={400} />
              ) : clickAnimation !== "off" ? (
                <Click variant={clickAnimation} color="var(--accent-strong)" size={100} duration={400} />
              ) : null}
              <RouterProvider router={router} future={{ v7_startTransition: true }} />
            </ToastProvider>
          </AnimateUIProvider>
        </QueryClientProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
