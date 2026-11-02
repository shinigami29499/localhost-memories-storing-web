import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "../../../store/authStore";
import type { UploadItem } from "../types";
import { useUploadNotificationStore } from "../../notifications/uploadNotificationStore";

type Category = "success" | "pending" | "failed";

export function uploadCategory(item: UploadItem): Category | null {
  if (item.status === "Success") return "success";
  if (item.status === "Failed") return "failed";
  if (["Pending", "Uploading", "Paused"].includes(item.status)) return "pending";
  return null;
}

interface ReadState {
  read: Record<string, Category>;
  markRead: (userId: string, items: UploadItem[]) => void;
}

export const useUploadReadStore = create<ReadState>()(persist((set) => ({
  read: {},
  markRead: (userId, items) => set((state) => {
    const read = { ...state.read };
    for (const item of items) {
      const category = uploadCategory(item);
      if (category) read[`${userId}:${item.id}`] = category;
    }
    return { read };
  }),
}), { name: "uploads.read-status" }));

export function useUnreadUploads() {
  const userId = useAuthStore((state) => state.user?.id) ?? "";
  const items = useUploadNotificationStore((state) => state.items);
  const markRead = useUploadNotificationStore((state) => state.markRead);
  const success = items.filter((item) => item.userId === userId && !item.readAt).length;
  const markAllRead = () => { if (userId) markRead(userId); };
  return { success, pending: 0, failed: 0, markAllRead };
}
