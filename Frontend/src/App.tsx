import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { lazy, Suspense, useEffect, useRef, type ReactNode } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { ApiError } from "./services/api";
import { useAnimationStore } from "./store/animationStore";
import { useAuthStore } from "./store/authStore";
import { LocaleProvider } from "./context/LocaleContext";
import { ToastProvider, showToast } from "./components/ui";
import { useLocale } from "./context/LocaleContext";
import { SessionReplacedDialog } from "./features/auth/SessionReplacedDialog";

const GalleryPage = lazy(() => import("./pages/gallery/GalleryPage").then((module) => ({ default: module.GalleryPage })));
const ErrorPage = lazy(() => import("./pages/ErrorPage").then((module) => ({ default: module.ErrorPage })));
const errorPage = <Suspense fallback={<main role="alert">Page unavailable.</main>}><ErrorPage /></Suspense>;
const AuthenticatedLayout = lazy(() => import("./components/layout/AuthenticatedLayout").then((module) => ({ default: module.AuthenticatedLayout })));
const GalleryLayout = lazy(() => import("./pages/gallery/GalleryLayout").then((module) => ({ default: module.GalleryLayout })));
const HomePage = lazy(() => import("./pages/home/HomePage").then((module) => ({ default: module.HomePage })));
const LoginPage = lazy(() => import("./pages/login/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("./pages/register/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const TrashPage = lazy(() => import("./pages/gallery/TrashPage").then((module) => ({ default: module.TrashPage })));
const AlbumsPage = lazy(() => import("./pages/albums/AlbumsPage").then((module) => ({ default: module.AlbumsPage })));
const AlbumPage = lazy(() => import("./pages/albums/AlbumPage").then((module) => ({ default: module.AlbumPage })));
const UsersPage = lazy(() => import("./pages/users/UsersPage").then((module) => ({ default: module.UsersPage })));
const LocationsPage = lazy(() => import("./pages/locations/LocationsPage").then((module) => ({ default: module.LocationsPage })));
const PlacePage = lazy(() => import("./pages/place/PlacePage").then((module) => ({ default: module.PlacePage })));
const UploadManagementPage = lazy(() => import("./pages/uploads/UploadManagementPage").then((module) => ({ default: module.UploadManagementPage })));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage").then((module) => ({ default: module.ProfilePage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !(error instanceof ApiError && error.status === 0) && failureCount < 1,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  },
});

function LegacyLocationRedirect() {
  const location = useLocation();
  return <Navigate replace to="/location" state={location.state} />;
}

/** / is the protected Home page; unauthenticated visitors land on /login or /register. */
const router = createBrowserRouter([
  {
    element: <RouteNotifications />,
    errorElement: errorPage,
    children: [
      {
        errorElement: errorPage,
        element: (
          <RequireAuth>
            <Suspense fallback={null}><AuthenticatedLayout /></Suspense>
          </RequireAuth>
        ),
        children: [
          { path: "/", element: <HomePage /> },
          {
            element: <GalleryLayout />,
            children: [
              { path: "/gallery", element: <GalleryPage view="pictures" /> },
              { path: "/gallery/favorites", element: <GalleryPage view="favorites" /> },
              { path: "/gallery/trash", element: <RequireAdmin><TrashPage /></RequireAdmin> },
              { path: "/gallery/album", element: <AlbumsPage /> },
            ],
          },
          { path: "/gallery/album/:albumId", element: <AlbumPage /> },
          { path: "/gallery/videos", element: <Navigate replace to="/gallery" /> },
          { path: "/library/gallery", element: <Navigate replace to="/gallery" /> },
          { path: "/library/gallery/videos", element: <Navigate replace to="/gallery" /> },
          { path: "/library/gallery/favorites", element: <Navigate replace to="/gallery/favorites" /> },
          { path: "/library/gallery/trash", element: <Navigate replace to="/gallery/trash" /> },
          { path: "/library/album", element: <Navigate replace to="/gallery/album" /> },
          { path: "/library/album/:albumId", element: <LegacyAlbumRedirect /> },
          { path: "/albums", element: <Navigate replace to="/gallery/album" /> },
          { path: "/albums/:albumId", element: <LegacyAlbumRedirect /> },
          { path: "/saved", element: <LegacyAlbumRedirect /> },
          { path: "/saved/:albumId", element: <LegacyAlbumRedirect /> },
          { path: "/uploads", element: <UploadManagementPage /> },
          { path: "/location/travel", element: <LocationsPage /> },
          {
            path: "/location",
            element: <PlacePage />,
            children: [
              { path: "saved" },
              { path: "history" },
            ],
          },
          { path: "/location/place", element: <LegacyLocationRedirect /> },
          { path: "/profile", element: <ProfilePage /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "/sync/upload", element: <Navigate replace to="/uploads" /> },
          { path: "/uploads/new", element: <Navigate replace to="/uploads" /> },
          { path: "/locations", element: <Navigate replace to="/location/travel" /> },
          { path: "/food", element: <Navigate replace to="/location" /> },
          { path: "/location/food", element: <Navigate replace to="/location" /> },
          { path: "/place", element: <Navigate replace to="/location" /> },
          { path: "/users", element: <UsersPage /> },
          { path: "/admin/users", element: <Navigate replace to="/users" /> },
        ],
      },
      {
        element: <Outlet />,
        children: [
          { path: "/login", element: <Suspense fallback={null}><LoginPage /></Suspense>, errorElement: errorPage },
          { path: "/register", element: <Suspense fallback={null}><RegisterPage /></Suspense>, errorElement: errorPage },
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

function RouteNotifications() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLocale();
  const handledLocation = useRef<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = CapacitorApp.addListener("backButton", () => {
      const historyIndex = window.history.state?.idx;
      if (typeof historyIndex === "number" && historyIndex > 0) {
        navigate(-1);
      } else if (location.pathname !== "/") {
        navigate("/", { replace: true });
      }
    });
    return () => { void listener.then((handle) => handle.remove()); };
  }, [location.pathname, navigate]);

  useEffect(() => {
    const state = location.state as { authToast?: { type: "login" | "logout"; username?: string } } | null;
    if (!state?.authToast || handledLocation.current === location.key) return;
    handledLocation.current = location.key;
    const { type, username } = state.authToast;
    if (type === "login" && username) {
      showToast.success(t("Login as {username} successfully", { username }), { highlight: [username] });
    }
    const { authToast: _, ...remainingState } = state;
    void navigate(location.pathname + location.search + location.hash, { replace: true, state: remainingState });
  }, [location, navigate, t]);

  return <Outlet />;
}

/** Session must carry the admin role; non-admins fall back to Home. */
function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user?.role?.toLowerCase() === "admin" ? children : <Navigate to="/" replace />;
}

function LegacyAlbumRedirect() {
  const { albumId } = useParams<{ albumId: string }>();
  return <Navigate replace to={albumId ? `/gallery/album/${albumId}` : "/gallery/album"} />;
}

export function App() {
  return (
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>
          <MotionPreferences>
            <ToastProvider>
              <RouterProvider router={router} future={{ v7_startTransition: true }} />
              <SessionReplacedDialog />
            </ToastProvider>
          </MotionPreferences>
        </QueryClientProvider>
      </LocaleProvider>
  );
}

function MotionPreferences({ children }: { children: ReactNode }) {
  const enabled = useAnimationStore((state) => state.enabled);
  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? "on" : "off";
  }, [enabled]);
  return <AnimateUIProvider tempo={1} reducedMotion={enabled ? "user" : "always"}>{children}</AnimateUIProvider>;
}
