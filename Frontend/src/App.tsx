import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useParams,
} from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { useAuthStore } from "./store/authStore";
import { AuthenticatedLayout } from "./components/layout/AuthenticatedLayout";
import { LoginPage } from "./pages/login/LoginPage";
import { RegisterPage } from "./pages/register/RegisterPage";
import { HomePage } from "./pages/home/HomePage";
import { GalleryPage } from "./pages/gallery/GalleryPage";
import { TrashPage } from "./pages/gallery/TrashPage";
import { AlbumsPage } from "./pages/albums/AlbumsPage";
import { AlbumPage } from "./pages/albums/AlbumPage";
import { UsersPage } from "./pages/users/UsersPage";
import { UploadManagementPage } from "./pages/uploads/UploadManagementPage";
import { ErrorPage } from "./pages/ErrorPage";
import { LoadingOverlay } from "./components/ui/LoadingOverlay";
import { TopographyBackground } from "./components/animate-ui/backgrounds/topography";
import { ThemeProvider } from "./context/ThemeContext";
import { LocaleProvider } from "./context/LocaleContext";
import { ToastProvider } from "./components/ui";

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
          { path: "/gallery", element: <GalleryPage key="pictures" view="pictures" /> },
          { path: "/gallery/videos", element: <GalleryPage key="videos" view="videos" /> },
          { path: "/gallery/favorites", element: <GalleryPage key="favorites" view="favorites" /> },
          {
            path: "/gallery/trash",
            element: (
              <RequireAdmin>
                <TrashPage />
              </RequireAdmin>
            ),
          },
          { path: "/albums", element: <AlbumsPage /> },
          { path: "/albums/:albumId", element: <AlbumPage /> },
          { path: "/saved", element: <LegacyAlbumRedirect /> },
          { path: "/saved/:albumId", element: <LegacyAlbumRedirect /> },
          { path: "/uploads", element: <UploadManagementPage /> },
          { path: "/uploads/new", element: <Navigate replace to="/uploads" /> },
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
]);

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
  return <Navigate replace to={albumId ? `/albums/${albumId}` : "/albums"} />;
}

export function App() {
  const routerState = false; // Placeholder for future route state management

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
              <LoadingOverlay isLoading={routerState}>
                <TopographyBackground className="fixed inset-0 pointer-events-none -z-10" />
                <RouterProvider router={router} />
              </LoadingOverlay>
            </ToastProvider>
          </AnimateUIProvider>
        </QueryClientProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
