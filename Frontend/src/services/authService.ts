import { api } from "./api";
import type { AuthSession, AuthUser } from "../types";

/** Endpoints under /api/auth. `skipAuthRefresh` prevents refresh loops on auth calls. */
export const authService = {
  register(username: string, password: string): Promise<AuthUser> {
    return api<AuthUser>("/api/auth/register", {
      method: "POST",
      body: { username, password },
      skipAuthRefresh: true,
    });
  },

  login(username: string, password: string): Promise<AuthSession> {
    return api<AuthSession>("/api/auth/login", {
      method: "POST",
      body: { username, password },
      skipAuthRefresh: true,
    });
  },

  logout(refreshToken: string, headers: Record<string, string>): Promise<void> {
    return api<void>("/api/auth/logout", {
      method: "POST",
      body: { refreshToken },
      headers,
      skipAuthRefresh: true,
    });
  },

  me(): Promise<{ id: string; username: string; isAdmin: boolean }> {
    return api("/api/auth/me");
  },
};
