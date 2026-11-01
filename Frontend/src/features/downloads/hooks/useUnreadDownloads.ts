import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "../../../store/authStore";
import type { DownloadBatch, DownloadItem } from "../services/downloadQueue";
import { useDownloadBatches } from "./useDownloadBatches";

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
  const read = useDownloadReadStore((state) => state.read);
  const { mergedBatches } = useDownloadBatches();
  const counts = { success: 0, pending: 0, failed: 0 };
  for (const batch of mergedBatches) {
    for (const item of batch.items) {
      const category = downloadCategory(item);
      if (category && read[downloadReadKey(userId, batch, item)] !== category) counts[category]++;
    }
  }
  return counts;
}
