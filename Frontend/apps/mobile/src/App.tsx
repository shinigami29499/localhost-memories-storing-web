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
import { MobileSessionReplacedDialog } from "./MobileSessionReplacedDialog";
import { isAlbumDetailHandoff, rememberMobilePageEntry, useMobileBack } from "./layout/mobilePageNavigation";
import { MobilePageLoadingOverlay } from "./layout/MobilePageLoadingOverlay";

import { uiRoute } from "@/features/ui-resources/uiRoute";
import { isReturningToMainPage } from "@/features/ui-resources/uiOverlayPolicy";
import { MobileGalleryLayout } from "./gallery/MobileGalleryLayout";
const albumsRoute = uiRoute("MobileAlbumsPage.tsx", () => import("./gallery/MobileAlbumsPage").then((module) => module.MobileAlbumsPage), skipMainPageOverlay);
const usersRoute = uiRoute("MobileUsersPage.tsx", () => import("./users/MobileUsersPage").then((module) => module.MobileUsersPage), skipMainPageOverlay);

function skipMainPageOverlay(url: URL) {
  return Boolean(router && isReturningToMainPage(router.state.location.pathname, url.pathname));
}

const ErrorPage = lazy(registerUiModule("Error page", () => import("./MobileErrorPage").then((module) => ({ default: module.MobileErrorPage }))));
const errorPage = <Suspense fallback={<main role="alert">Page unavailable.</main>}><ErrorPage /></Suspense>;
const AuthenticatedLayout = lazy(registerUiModule("App navigation", () => import("./MobileLayout").then((module) => ({ default: module.AuthenticatedLayout }))));
const loginRoute = uiRoute("MobileLoginPage.tsx", () => import("./MobileLoginPage").then((module) => module.LoginPage));
const registerRoute = uiRoute("MobileRegisterPage.tsx", () => import("./MobileRegisterPage").then((module) => module.RegisterPage));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !(error instanceof ApiError && error.status === 0) && failureCount < 1,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  },
});

function PublicPages() {
  const navigation = useNavigation();
  return navigation.location ? <MobilePageLoadingOverlay pathname={navigation.location.pathname} /> : <Outlet />;
}

function LegacyLocationRedirect() {
  const location = useLocation();
  return <Navigate replace to="/location" state={location.state} />;
}

function LegacyUserRedirect({ to }: { to: string }) {
  const { search, hash, state } = useLocation();
  return <Navigate replace to={{ pathname: to, search, hash }} state={state} />;
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
            <Suspense fallback={isStartupPrepared() ? null : <MobilePageLoadingOverlay />}><AuthenticatedLayout /></Suspense>
          </RequireAuth>
        ),
        children: [
          { path: "/", ...uiRoute("MobileHomePage.tsx", () => import("./MobileHomePage").then((module) => module.HomePage), skipMainPageOverlay) },
          {
            element: <MobileGalleryLayout />,
            children: [
              { path: "/album", ...albumsRoute },
            ],
          },
          {
            path: "/album/:albumId",
            ...uiRoute("MobileAlbumPage.tsx", () => import("./gallery/MobileAlbumPage").then((module) => module.MobileAlbumPage),
              (url) => Boolean(router && isAlbumDetailHandoff(router.state.location.pathname, url.pathname))),
          },
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
          { path: "/uploads", ...uiRoute("MobileUploadPage.tsx", () => import("./uploads/MobileUploadPage").then((module) => module.MobileUploadPage)) },
          { path: "/location/travel", ...uiRoute("MobileTravelPage.tsx", () => import("./places/MobileTravelPage").then((module) => module.MobileTravelPage)) },
          {
            path: "/location",
            ...uiRoute("MobilePlacePage.tsx", () => import("./places/MobilePlacePage").then((module) => module.MobilePlacePage), skipMainPageOverlay),
            children: [
              { path: "saved" },
              { path: "history" },
            ],
          },
          { path: "/location/place", element: <LegacyLocationRedirect /> },
          { path: "/profile", ...uiRoute("MobileProfilePage.tsx", () => import("./MobileProfilePage").then((module) => module.ProfilePage)) },
          { path: "/settings", ...uiRoute("MobileSettingsPage.tsx", () => import("./settings/MobileSettingsPage").then((module) => module.SettingsPage)) },
          { path: "/sync/upload", element: <Navigate replace to="/uploads" /> },
          { path: "/uploads/new", element: <Navigate replace to="/uploads" /> },
          { path: "/locations", element: <Navigate replace to="/location/travel" /> },
          { path: "/food", element: <Navigate replace to="/location" /> },
          { path: "/location/food", element: <Navigate replace to="/location" /> },
          { path: "/place", element: <Navigate replace to="/location" /> },
          { path: "/user", ...usersRoute },
          { path: "/user/pending", ...usersRoute },
          { path: "/user/blocked", ...usersRoute },
          { path: "/users", element: <LegacyUserRedirect to="/user" /> },
          { path: "/users/pending", element: <LegacyUserRedirect to="/user/pending" /> },
          { path: "/users/blocked", element: <LegacyUserRedirect to="/user/blocked" /> },
          { path: "/admin/users", element: <LegacyUserRedirect to="/user" /> },
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
  let previousLocation = router.state.location;
  router.subscribe(({ location, historyAction }) => {
    if (location.key === previousLocation.key) return;
    rememberMobilePageEntry(previousLocation, location, historyAction === "POP");
    previousLocation = location;
  });
  return router;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  return token ? children : <Navigate to="/login" replace />;
}

function RouteNotifications() {
  const location = useLocation();
  const navigate = useNavigate();
  const goBack = useMobileBack();
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
      if (useAuthStore.getState().accessToken && location.pathname !== "/login" && location.pathname !== "/register") {
        goBack();
        return;
      }
      const historyIndex = window.history.state?.idx;
      if (typeof historyIndex === "number" && historyIndex > 0) {
        navigate(-1);
      } else if (location.pathname !== "/") {
        navigate("/", { replace: true });
      }
    });
    return () => { void listener.then((handle) => handle.remove()); };
  }, [location.pathname, navigate, goBack]);

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
              <RouterProvider router={getRouter()} fallbackElement={isStartupPrepared() ? null : <MobilePageLoadingOverlay />} future={{ v7_startTransition: true }} />
              <MobileSessionReplacedDialog />
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

