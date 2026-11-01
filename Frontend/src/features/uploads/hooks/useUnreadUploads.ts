import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { uploadService } from "../services/uploadService";
import type { UploadBatch, UploadItem } from "../types";

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
  const user = useAuthStore((state) => state.user);
  const read = useUploadReadStore((state) => state.read);
  const isAdmin = user?.role.toLowerCase() === "admin";
  const query = useQuery({
    queryKey: ["uploads", "unread", user?.id, isAdmin],
    enabled: !!user?.id,
    queryFn: async () => {
      const batches: UploadBatch[] = [];
      let offset = 0;
      while (true) {
        const page = isAdmin ? await uploadService.listAll(offset, 100) : await uploadService.list(offset, 100);
        batches.push(...page.items);
        offset += page.items.length;
        if (!page.items.length || offset >= page.totalItems) return batches;
      }
    },
  });
  const counts = { success: 0, pending: 0, failed: 0 };
  for (const batch of query.data ?? []) {
    for (const item of batch.items) {
      const category = uploadCategory(item);
      if (category && read[`${user?.id}:${item.id}`] !== category) counts[category]++;
    }
  }
  const markAllRead = () => {
    if (user?.id && query.data) useUploadReadStore.getState().markRead(user.id, query.data.flatMap((batch) => batch.items));
  };
  return { ...counts, markAllRead };
}
