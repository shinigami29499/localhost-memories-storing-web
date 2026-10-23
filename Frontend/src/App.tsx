import { Navigate, Route, RouterProvider, createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";
import { LoginPage } from "./pages/login/LoginPage";
import { HomePage } from "./pages/home/HomePage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false } },
});

/** / is the protected feed; unauthenticated visitors land on /login. */
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireAuth>
        <HomePage />
      </RequireAuth>
    ),
  },
  { path: "/login", element: <LoginPage /> },
  { path: "*", element: <Navigate replace to="/" /> },
]);

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  return token ? children : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
