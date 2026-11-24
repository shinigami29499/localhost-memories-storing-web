import { api } from "../../../services/api";
import type { AuthUser } from "../../auth/types";

export interface UserPage {
  items: AuthUser[];
  page: number;
  limit: number;
  total: number;
}

/** Account profiles and user management endpoints under /api/user. */
export const userService = {
  profile(): Promise<AuthUser> {
    return api("/api/user/me");
  },

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return api("/api/user/me/password", { method: "PUT", body: { currentPassword, newPassword } });
  },

  setAvatar(seed: string): Promise<AuthUser> {
    return api("/api/user/me/avatar", { method: "PUT", body: { seed } });
  },

  list(signal?: AbortSignal): Promise<AuthUser[]> {
    return api("/api/user", { signal });
  },

  page(page: number, limit: number, pendingOnly = false, signal?: AbortSignal, blockedOnly = false): Promise<UserPage> {
    return api(`/api/user/page?page=${page}&limit=${limit}&pendingOnly=${pendingOnly}&blockedOnly=${blockedOnly}`, { signal });
  },

  heartbeat(): Promise<{ lastSeenAt: string }> {
    return api("/api/user/me/heartbeat", { method: "POST" });
  },

  offline(): Promise<void> {
    return api("/api/user/me/offline", { method: "POST" });
  },

  approve(userId: string): Promise<AuthUser> {
    return api<AuthUser>(`/api/user/${userId}/approve`, { method: "POST" });
  },

  reject(userId: string): Promise<AuthUser> {
    return api<AuthUser>(`/api/user/${userId}/reject`, { method: "POST" });
  },

  requestApproval(): Promise<AuthUser> {
    return api<AuthUser>("/api/user/me/request-approval", { method: "POST" });
  },

  disable(userId: string): Promise<AuthUser> {
    return api<AuthUser>(`/api/user/${userId}/disable`, { method: "POST" });
  },

  activate(userId: string): Promise<AuthUser> {
    return api<AuthUser>(`/api/user/${userId}/activate`, { method: "POST" });
  },

  updateRole(userId: string, role: "admin" | "user"): Promise<AuthUser> {
    return api<AuthUser>(`/api/user/${userId}/role`, { method: "PUT", body: { role } });
  },

  remove(userId: string): Promise<void> {
    return api<void>(`/api/user/${userId}`, { method: "DELETE" });
  },
};
