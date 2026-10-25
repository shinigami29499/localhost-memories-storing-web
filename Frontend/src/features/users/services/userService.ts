import { api } from "../../../services/api";
import type { AuthUser } from "../../auth/types";

/** Admin-only user management endpoints under /api/users. */
export const userService = {
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
