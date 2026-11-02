import { useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "../../../store/authStore";
import type { UploadBatch, UploadItem } from "../types";
import { useUploadNotificationStore } from "../../notifications/uploadNotificationStore";
import { useQueryClient } from "@tanstack/react-query";
import { uploadService } from "../services/uploadService";

type Category = "success" | "pending" | "failed";

export function uploadCategory(item: UploadItem): Category | null {
  if (item.status === "Success") return "success";
  if (item.status === "Failed") return "failed";
  if (["Pending", "Uploading", "Paused"].includes(item.status)) return "pending";
  return null;
}

interface ReadState {
  read: Record<string, Category>;
  pendingBatchIds: Record<string, string[]>;
  markBatchRead: (userId: string, batchId: string, items: UploadItem[]) => void;
  markBatchesRead: (userId: string, batches: UploadBatch[]) => void;
  clearPendingBatches: (userId: string) => void;
}

export const useUploadReadStore = create<ReadState>()(persist((set) => ({
  read: {},
  pendingBatchIds: {},
  markBatchRead: (userId, batchId, items) => set((state) => {
    const read = { ...state.read };
    for (const item of items) {
      const category = uploadCategory(item);
      if (category) read[`${userId}:${item.id}`] = category;
    }
    const pendingBatchIds = state.pendingBatchIds[userId] ?? [];
    return {
      read,
      pendingBatchIds: {
        ...state.pendingBatchIds,
        [userId]: pendingBatchIds.includes(batchId) ? pendingBatchIds : [...pendingBatchIds, batchId],
      },
    };
  }),
  markBatchesRead: (userId, batches) => set((state) => {
    const read = { ...state.read };
    for (const batch of batches) {
      for (const item of batch.items) {
        const category = uploadCategory(item);
        if (category) read[`${userId}:${item.id}`] = category;
      }
    }
    const pendingBatchIds = { ...state.pendingBatchIds };
    delete pendingBatchIds[userId];
    return { read, pendingBatchIds };
  }),
  clearPendingBatches: (userId) => set((state) => {
    const pendingBatchIds = { ...state.pendingBatchIds };
    delete pendingBatchIds[userId];
    return { pendingBatchIds };
  }),
}), { name: "uploads.read-status" }));

export function useUnreadUploads() {
  const userId = useAuthStore((state) => state.user?.id) ?? "";
  const items = useUploadNotificationStore((state) => state.items);
  const markNotificationsRead = useUploadNotificationStore((state) => state.markRead);
  const queryClient = useQueryClient();
  const success = items.filter((item) => item.userId === userId && item.id.startsWith(`upload:${userId}:`) && !item.readAt).length;
  const markBatchesRead = useUploadReadStore((state) => state.markBatchesRead);
  const clearPendingBatches = useUploadReadStore((state) => state.clearPendingBatches);
  const read = useUploadReadStore((state) => state.read);

  const syncSeenStatus = useCallback(async () => {
    if (!userId) return;
    const pendingBatchIds = useUploadReadStore.getState().pendingBatchIds[userId] ?? [];
    if (pendingBatchIds.length === 0) return;
    try {
      await uploadService.markBatchesViewed(pendingBatchIds);
      clearPendingBatches(userId);
      await queryClient.invalidateQueries({ queryKey: ["uploads"] });
    } catch {
      // Keep locally seen batch IDs queued for the next page exit.
    }
  }, [clearPendingBatches, queryClient, userId]);

  const hasUnseenBatches = (batches: UploadBatch[]) => batches.some((batch) =>
    !batch.viewedAt && batch.items.some((item) => {
      const category = uploadCategory(item);
      return category && read[`${userId}:${item.id}`] !== category;
    }));

  const markAllRead = (batches: UploadBatch[]) => {
    if (!userId) return;
    void uploadService.markAllBatchesViewed()
      .then(async () => {
        markNotificationsRead(userId);
        markBatchesRead(userId, batches);
        await queryClient.invalidateQueries({ queryKey: ["uploads"] });
      })
      .catch(() => undefined);
  };
  return { success, pending: 0, failed: 0, markAllRead, syncSeenStatus, hasUnseenBatches };
}
