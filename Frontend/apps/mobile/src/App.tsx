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
import { ApiError } from "@/services/api";
import { useAnimationStore } from "@/store/animationStore";
import { useAuthStore } from "@/store/authStore";
import { LocaleProvider } from "@/context/LocaleContext";
import { ToastProvider, showToast } from "@/components/ui";
import { useLocale } from "@/context/LocaleContext";
import { MobileSessionReplacedDialog } from "./MobileSessionReplacedDialog";
import { updateMobilePageTransition, useMobileBack } from "./layout/mobilePageNavigation";

const loadAlbums = () => import("./gallery/MobileAlbumsPage").then(({ MobileAlbumsPage }) => ({ Component: MobileAlbumsPage }));
const ErrorPage = lazy(() => import("./MobileErrorPage").then((module) => ({ default: module.MobileErrorPage })));
const errorPage = <Suspense fallback={<main role="alert">Page unavailable.</main>}><ErrorPage /></Suspense>;
const AuthenticatedLayout = lazy(() => import("./MobileLayout").then((module) => ({ default: module.AuthenticatedLayout })));
const LoginPage = lazy(() => import("./MobileLoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("./MobileRegisterPage").then((module) => ({ default: module.RegisterPage })));
const loadUsers = () => import("./users/MobileUsersPage").then(({ MobileUsersPage }) => ({ Component: MobileUsersPage }));
const LocationsPage = lazy(() => import("./places/MobileTravelPage").then((module) => ({ default: module.MobileTravelPage })));

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
          { path: "/", lazy: () => import("./MobileHomePage").then(({ HomePage }) => ({ Component: HomePage })) },
          {
            lazy: () => import("./gallery/MobileGalleryLayout").then(({ MobileGalleryLayout }) => ({ Component: MobileGalleryLayout })),
            children: [
              { path: "/gallery", lazy: loadAlbums },
              { path: "/gallery/trash", element: <Navigate replace to="/gallery/album" /> },
              { path: "/gallery/album", lazy: loadAlbums },
            ],
          },
          { path: "/gallery/album/:albumId", lazy: () => import("./gallery/MobileAlbumPage").then(({ MobileAlbumPage }) => ({ Component: MobileAlbumPage })) },
          { path: "/gallery/videos", element: <Navigate replace to="/gallery" /> },
          { path: "/library/gallery", element: <Navigate replace to="/gallery" /> },
          { path: "/library/gallery/videos", element: <Navigate replace to="/gallery" /> },
          { path: "/gallery/favorites", element: <Navigate replace to="/gallery" /> },
          { path: "/library/gallery/favorites", element: <Navigate replace to="/gallery" /> },
          { path: "/library/gallery/trash", element: <Navigate replace to="/gallery/trash" /> },
          { path: "/library/album", element: <Navigate replace to="/gallery/album" /> },
          { path: "/library/album/:albumId", element: <LegacyAlbumRedirect /> },
          { path: "/albums", element: <Navigate replace to="/gallery/album" /> },
          { path: "/albums/:albumId", element: <LegacyAlbumRedirect /> },
          { path: "/saved", element: <LegacyAlbumRedirect /> },
          { path: "/saved/:albumId", element: <LegacyAlbumRedirect /> },
          { path: "/uploads", lazy: () => import("./uploads/MobileUploadPage").then(({ MobileUploadPage }) => ({ Component: MobileUploadPage })) },
          { path: "/location/travel", element: <LocationsPage /> },
          {
            path: "/location",
            lazy: () => import("./places/MobilePlacePage").then(({ MobilePlacePage }) => ({ Component: MobilePlacePage })),
            children: [
              { path: "saved" },
              { path: "history" },
            ],
          },
          { path: "/location/place", element: <LegacyLocationRedirect /> },
          { path: "/profile", lazy: () => import("./MobileProfilePage").then(({ ProfilePage }) => ({ Component: ProfilePage })) },
          { path: "/settings", lazy: () => import("./settings/MobileSettingsPage").then(({ SettingsPage }) => ({ Component: SettingsPage })) },
          { path: "/sync/upload", element: <Navigate replace to="/uploads" /> },
          { path: "/uploads/new", element: <Navigate replace to="/uploads" /> },
          { path: "/locations", element: <Navigate replace to="/location/travel" /> },
          { path: "/food", element: <Navigate replace to="/location" /> },
          { path: "/location/food", element: <Navigate replace to="/location" /> },
          { path: "/place", element: <Navigate replace to="/location" /> },
          { path: "/users", lazy: loadUsers },
          { path: "/users/pending", lazy: loadUsers },
          { path: "/users/blocked", lazy: loadUsers },
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

let previousLocation = router.state.location;
router.subscribe(({ location, historyAction }) => {
  if (location.key === previousLocation.key) return;
  updateMobilePageTransition(previousLocation, location, historyAction === "POP", queryClient.getQueryCache());
  previousLocation = location;
});

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
  return <Navigate replace to={albumId ? `/gallery/album/${albumId}` : "/gallery/album"} />;
}

export function App() {
  return (
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>
          <MotionPreferences>
            <ToastProvider>
              <RouterProvider router={router} future={{ v7_startTransition: true }} />
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

