import { isStartupPrepared, registerUiModule, takeStartupWelcome } from "@/features/ui-resources/uiModules";
import {
  Navigate,
  Outlet,
  RouterProvider,
  type RouteObject,
  createBrowserRouter,
  useLocation,
  useNavigate,
  useNavigation,
  useParams,
} from "react-router-dom";
import { lazy, Suspense, useEffect, useRef, type ReactNode } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { ApiError } from "@/services/api";
import { useAnimationStore } from "@/store/animationStore";
import { useAuthStore } from "@/store/authStore";
import { LocaleProvider } from "@/context/LocaleContext";
import { ToastProvider, showToast } from "@/components/ui";
import { useLocale } from "@/context/LocaleContext";
import { SessionReplacedDialog } from "@/features/auth/SessionReplacedDialog";

import { GalleryLayout } from "./pages/gallery/GalleryLayout";
import { uiRoute, useUiRouteProgress } from "@/features/ui-resources/uiRoute";
import { isReturningToMainPage } from "@/features/ui-resources/uiOverlayPolicy";
import { UiResourceProgress } from "@/features/ui-resources/UiResourceProgress";

const ErrorPage = lazy(registerUiModule("Error page", () => import("./pages/ErrorPage").then((module) => ({ default: module.ErrorPage }))));
const errorPage = <Suspense fallback={<main role="alert">Page unavailable.</main>}><ErrorPage /></Suspense>;
const AuthenticatedLayout = lazy(registerUiModule("App navigation", () => import("./components/AuthenticatedLayout").then((module) => ({ default: module.AuthenticatedLayout }))));
const HomePage = uiRoute("HomePage.tsx", () => import("./pages/home/HomePage").then((module) => module.HomePage), skipMainPageOverlay);
const loginRoute = uiRoute("LoginPage.tsx", () => import("./pages/login/LoginPage").then((module) => module.LoginPage));
const registerRoute = uiRoute("RegisterPage.tsx", () => import("./pages/register/RegisterPage").then((module) => module.RegisterPage));
const AlbumsPage = uiRoute("AlbumsPage.tsx", () => import("./pages/albums/AlbumsPage").then((module) => module.AlbumsPage), skipMainPageOverlay);
const AlbumPage = uiRoute("AlbumPage.tsx", () => import("./pages/albums/AlbumPage").then((module) => module.AlbumPage));
const UsersPage = uiRoute("UsersPage.tsx", () => import("./pages/users/UsersPage").then((module) => module.UsersPage), skipMainPageOverlay);
const LocationsPage = uiRoute("LocationsPage.tsx", () => import("./pages/locations/LocationsPage").then((module) => module.LocationsPage));
const PlacePage = uiRoute("PlacePage.tsx", () => import("./pages/place/PlacePage").then((module) => module.PlacePage), skipMainPageOverlay);
const UploadManagementPage = uiRoute("UploadManagementPage.tsx", () => import("./pages/uploads/UploadManagementPage").then((module) => module.UploadManagementPage));
const SettingsPage = uiRoute("SettingsPage.tsx", () => import("./pages/settings/SettingsPage").then((module) => module.SettingsPage));
const ProfilePage = uiRoute("ProfilePage.tsx", () => import("./pages/profile/ProfilePage").then((module) => module.ProfilePage));

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

function skipMainPageOverlay(url: URL) {
  return Boolean(router && isReturningToMainPage(router.state.location.pathname, url.pathname));
}

function WebUiRouteFallback({ pathname = window.location.pathname }: { pathname?: string }) {
  const { t } = useLocale();
  const progress = useUiRouteProgress(pathname);
  return <div className="ui-resource-loading ui-resource-loading--startup">
    <UiResourceProgress key={pathname} label={t("Loading page...")} loaded={progress?.loaded} total={progress?.total} stepped />
  </div>;
}

function PublicPages() {
  const navigation = useNavigation();
  return navigation.location ? <WebUiRouteFallback pathname={navigation.location.pathname} /> : <Outlet />;
}

/** / is the protected Home page; unauthenticated visitors land on /login or /register. */
const routes: RouteObject[] = [
  {
    element: <RouteNotifications />,
    errorElement: errorPage,
    children: [
      {
        errorElement: errorPage,
        element: (
          <RequireAuth>
            <Suspense fallback={isStartupPrepared() ? null : <WebUiRouteFallback />}><AuthenticatedLayout /></Suspense>
          </RequireAuth>
        ),
        children: [
          { path: "/", ...HomePage },
          {
            element: <GalleryLayout />,
            children: [
              { path: "/album", ...AlbumsPage },
            ],
          },
          { path: "/album/:albumId", ...AlbumPage },
          { path: "/gallery", element: <Navigate replace to="/album" /> },
          { path: "/gallery/album", element: <Navigate replace to="/album" /> },
          { path: "/gallery/album/:albumId", element: <LegacyAlbumRedirect /> },
          { path: "/gallery/trash", element: <Navigate replace to="/album" /> },
          { path: "/gallery/videos", element: <Navigate replace to="/album" /> },
          { path: "/library/gallery", element: <Navigate replace to="/album" /> },
          { path: "/library/gallery/videos", element: <Navigate replace to="/album" /> },
          { path: "/gallery/favorites", element: <Navigate replace to="/album" /> },
          { path: "/library/gallery/favorites", element: <Navigate replace to="/album" /> },
          { path: "/library/gallery/trash", element: <Navigate replace to="/album" /> },
          { path: "/library/album", element: <Navigate replace to="/album" /> },
          { path: "/library/album/:albumId", element: <LegacyAlbumRedirect /> },
          { path: "/albums", element: <Navigate replace to="/album" /> },
          { path: "/albums/:albumId", element: <LegacyAlbumRedirect /> },
          { path: "/saved", element: <LegacyAlbumRedirect /> },
          { path: "/saved/:albumId", element: <LegacyAlbumRedirect /> },
          { path: "/uploads", ...UploadManagementPage },
          { path: "/location/travel", ...LocationsPage },
          {
            path: "/location",
            ...PlacePage,
            children: [
              { path: "saved" },
              { path: "history" },
            ],
          },
          { path: "/location/place", element: <LegacyLocationRedirect /> },
          { path: "/profile", ...ProfilePage },
          { path: "/settings", ...SettingsPage },
          { path: "/sync/upload", element: <Navigate replace to="/uploads" /> },
          { path: "/uploads/new", element: <Navigate replace to="/uploads" /> },
          { path: "/locations", element: <Navigate replace to="/location/travel" /> },
          { path: "/food", element: <Navigate replace to="/location" /> },
          { path: "/location/food", element: <Navigate replace to="/location" /> },
          { path: "/place", element: <Navigate replace to="/location" /> },
          { path: "/users", ...UsersPage },
          { path: "/users/pending", ...UsersPage },
          { path: "/users/blocked", ...UsersPage },
          { path: "/admin/users", element: <Navigate replace to="/users" /> },
        ],
      },
      {
        element: <PublicPages />,
        children: [
          { path: "/login", ...loginRoute, errorElement: errorPage },
          { path: "/register", ...registerRoute, errorElement: errorPage },
        ],
      },
      { path: "*", element: <Navigate replace to="/" /> },
    ],
  },
];

let router: ReturnType<typeof createBrowserRouter> | undefined;

function getRouter() {
  if (router) return router;
  router = createBrowserRouter(routes, { future: { v7_relativeSplatPath: true } });
  return router;
}

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
    if (location.pathname !== "/") return;
    const username = takeStartupWelcome();
    if (username) showToast.success(t("Welcome back, {username}", { username }), { highlight: [username] });
  }, [location.pathname, t]);

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
  return user?.status === "active" && ["admin", "superadmin"].includes(user.role.toLowerCase()) ? children : <Navigate to="/" replace />;
}

function LegacyAlbumRedirect() {
  const { albumId } = useParams<{ albumId: string }>();
  const { search, hash } = useLocation();
  return <Navigate replace to={`${albumId ? `/album/${albumId}` : "/album"}${search}${hash}`} />;
}

export function App() {
  return (
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>
          <MotionPreferences>
            <ToastProvider>
              <RouterProvider router={getRouter()} fallbackElement={isStartupPrepared() ? null : <WebUiRouteFallback />} future={{ v7_startTransition: true }} />
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
