import { api } from "../../../services/api";
import type { AuthUser } from "../../auth/types";

/** Account profiles and user management endpoints under /api/users. */
export const userService = {
  profile(): Promise<AuthUser> {
    return api("/api/users/me");
  },

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return api("/api/users/me/password", { method: "PUT", body: { currentPassword, newPassword } });
  },

  setAvatar(seed: string): Promise<AuthUser> {
    return api("/api/users/me/avatar", { method: "PUT", body: { seed } });
  },

  list(): Promise<AuthUser[]> {
    return api("/api/users");
  },

  heartbeat(): Promise<{ lastSeenAt: string }> {
    return api("/api/users/me/heartbeat", { method: "POST" });
  },

  offline(): Promise<void> {
    return api("/api/users/me/offline", { method: "POST" });
  },

  approve(userId: string): Promise<AuthUser> {
    return api<AuthUser>(`/api/users/${userId}/approve`, { method: "POST" });
  },

  disable(userId: string): Promise<AuthUser> {
    return api<AuthUser>(`/api/users/${userId}/disable`, { method: "POST" });
  },

  activate(userId: string): Promise<AuthUser> {
    return api<AuthUser>(`/api/users/${userId}/activate`, { method: "POST" });
  },

  updateRole(userId: string, role: "admin" | "user"): Promise<AuthUser> {
    return api<AuthUser>(`/api/users/${userId}/role`, { method: "PUT", body: { role } });
  },

  remove(userId: string): Promise<void> {
    return api<void>(`/api/users/${userId}`, { method: "DELETE" });
  },
};
