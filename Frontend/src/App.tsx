import { Navigate, Route, RouterProvider, createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";
import { LoginPage } from "./pages/login/LoginPage";
import { RegisterPage } from "./pages/register/RegisterPage";
import { HomePage } from "./pages/home/HomePage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminPostsPage } from "./pages/admin/AdminPostsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false } },
});

/** / is the protected feed; unauthenticated visitors land on /login or /register. */
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireAuth>
        <HomePage />
      </RequireAuth>
    ),
  },
  {
    path: "/admin/users",
    element: (
      <RequireAuth>
        <RequireAdmin>
          <AdminUsersPage />
        </RequireAdmin>
      </RequireAuth>
    ),
  },
  {
    path: "/admin/posts",
    element: (
      <RequireAuth>
        <RequireAdmin>
          <AdminPostsPage />
        </RequireAdmin>
      </RequireAuth>
    ),
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "*", element: <Navigate replace to="/" /> },
]);

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
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
