import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthSession, AuthUser } from "../types";

/**
 * Authentication state. Persisted to localStorage so a page reload keeps the
 * session; the access token lives here and is attached by the API client.
 */
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: AuthSession) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: "shinigacim-auth" },
  ),
);

export function isAuthenticated(): boolean {
  return useAuthStore.getState().accessToken !== null;
}
