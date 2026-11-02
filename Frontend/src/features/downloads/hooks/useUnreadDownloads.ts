import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "../../../store/authStore";
import { useDownloadStore, type DownloadBatch, type DownloadItem } from "../services/downloadQueue";
import { useDownloadNotificationStore } from "../../notifications/downloadNotificationStore";
import { useQueryClient } from "@tanstack/react-query";
import { markAllDownloadBatchesViewed } from "../services/downloadHistory";

type Category = "success" | "pending" | "failed";

export function downloadCategory(item: DownloadItem): Category | null {
  if (item.status === "Sent to browser") return "success";
  if (item.status === "Failed") return "failed";
  if (["Pending", "Downloading", "Paused"].includes(item.status)) return "pending";
  return null;
}

export function downloadReadKey(userId: string, batch: DownloadBatch, item: DownloadItem) {
  return `${userId}:${batch.userId ?? ""}:${batch.id}:${item.id}`;
}

interface ReadState {
  read: Record<string, Category>;
  markRead: (userId: string, batch: DownloadBatch, items: DownloadItem[]) => void;
}

export const useDownloadReadStore = create<ReadState>()(persist((set) => ({
  read: {},
  markRead: (userId, batch, items) => set((state) => {
    const read = { ...state.read };
    for (const item of items) {
      const category = downloadCategory(item);
      if (category) read[downloadReadKey(userId, batch, item)] = category;
    }
    return { read };
  }),
}), { name: "downloads.read-status" }));

export function useUnreadDownloads() {
  const userId = useAuthStore((state) => state.user?.id) ?? "";
  const items = useDownloadNotificationStore((state) => state.items);
  const markRead = useDownloadNotificationStore((state) => state.markRead);
  const queryClient = useQueryClient();
  const unread = items.filter((item) => item.userId === userId && !item.readAt);
  const success = unread.filter((item) => item.successfulFiles > 0).length;
  const failed = unread.filter((item) => item.failedFiles > 0).length;
  const markAllRead = () => {
    if (!userId) return;
    markRead(userId);
    void markAllDownloadBatchesViewed()
      .then(() => queryClient.invalidateQueries({ queryKey: ["download-batches"] }))
      .catch(() => undefined);
  };
  return { success, pending: 0, failed, markAllRead };
}
