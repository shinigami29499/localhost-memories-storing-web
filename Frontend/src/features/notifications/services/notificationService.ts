import { api } from "../../../services/api";
import type { NotificationFeed } from "../types";

export const notificationService = {
  list(limit = 50): Promise<NotificationFeed> {
    return api(`/api/notifications?limit=${limit}`);
  },

  markRead(notificationId: string): Promise<void> {
    return api(`/api/notifications/${notificationId}/read`, { method: "POST" });
  },

  markAllRead(): Promise<void> {
    return api("/api/notifications/read", { method: "POST" });
  },
};
