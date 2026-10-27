import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { useAuthStore } from "./store/authStore";
import { AuthenticatedLayout } from "./components/layout/AuthenticatedLayout";
import { PageStackTransition } from "./components/animate-ui/components/PageStackTransition";
import { LoginPage } from "./pages/login/LoginPage";
import { RegisterPage } from "./pages/register/RegisterPage";
import { HomePage } from "./pages/home/HomePage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminPostsPage } from "./pages/admin/AdminPostsPage";
import { ErrorPage } from "./pages/ErrorPage";
import { PostDetailPage } from "./pages/posts/PostDetailPage";
import { LoadingOverlay } from "./components/ui/LoadingOverlay";
import { TopographyBackground } from "./components/animate-ui/backgrounds/topography";
import { ThemeProvider } from "./context/ThemeContext";
import { LocaleProvider } from "./context/LocaleContext";
import { ToastProvider } from "./components/ui";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false } },
});

/** / is the protected feed; unauthenticated visitors land on /login or /register. */
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
          { path: "/posts/:postId", element: <PostDetailPage /> },
          {
            path: "/admin/users",
            element: (
              <RequireAdmin>
                <AdminUsersPage />
              </RequireAdmin>
            ),
          },
          {
            path: "/admin/posts",
            element: (
              <RequireAdmin>
                <AdminPostsPage />
              </RequireAdmin>
            ),
          },
        ],
      },
      {
        element: <PublicRouteLayout />,
        children: [
          { path: "/login", element: <LoginPage />, errorElement: <ErrorPage /> },
          { path: "/register", element: <RegisterPage />, errorElement: <ErrorPage /> },
        ],
      },
      { path: "*", element: <Navigate replace to="/" /> },
    ],
  },
]);

function PublicRouteLayout() {
  return (
    <PageStackTransition>
      <Outlet />
    </PageStackTransition>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  return token ? children : <Navigate to="/login" replace />;
}

/** Session must carry the admin role; non-admins fall back to the feed. */
function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user?.role?.toLowerCase() === "admin" ? children : <Navigate to="/" replace />;
}

export function App() {
  const routerState = false; // Placeholder for future route state management

  return (
    <ThemeProvider>
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>
          <AnimateUIProvider tempo={1}>
            <ToastProvider>
              <LoadingOverlay isLoading={routerState}>
                <TopographyBackground className="fixed inset-0 pointer-events-none -z-10" />
                <RouterProvider router={router} future={{ v7_startTransition: true }} />
              </LoadingOverlay>
            </ToastProvider>
          </AnimateUIProvider>
        </QueryClientProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
