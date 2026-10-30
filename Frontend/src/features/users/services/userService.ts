import { api } from "../../../services/api";
import type { AuthUser } from "../../auth/types";

/** Account profiles and user management endpoints under /api/users. */
export const userService = {
  profile(): Promise<AuthUser> {
    return api("/api/users/me");
  },

  setAvatar(seed: string): Promise<AuthUser> {
    return api("/api/users/me/avatar", { method: "PUT", body: { seed } });
  },

  list(): Promise<AuthUser[]> {
    return api("/api/users");
  },

  approve(userId: string): Promise<AuthUser> {
    return api<AuthUser>(`/api/users/${userId}/approve`, { method: "POST" });
  },

  remove(userId: string): Promise<void> {
    return api<void>(`/api/users/${userId}`, { method: "DELETE" });
  },
};
