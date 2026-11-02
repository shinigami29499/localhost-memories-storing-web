import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UploadBatch } from "../uploads/types";

export interface UploadNotification {
  id: string;
  userId: string;
  notificationType: "UploadCompleted";
  createdAt: string;
  readAt: string | null;
  username?: string;
  images?: number;
  videos?: number;
  failedFiles?: number;
  cancelledFiles?: number;
}

interface UploadNotificationState {
  items: UploadNotification[];
  add: (userId: string, batch: UploadBatch) => void;
  addRemote: (userId: string, event: { batchId: string; ownerId: string; username: string; images: number; videos: number; createdAt: string }) => void;
  markRead: (userId: string, id?: string) => void;
}

export const useUploadNotificationStore = create<UploadNotificationState>()(
  persist(
    (set) => ({
      items: [],
      add: (userId, batch) => set((state) => {
        const id = `upload:${userId}:${batch.id}`;
        if (state.items.some((item) => item.id === id)) return state;
        const notification: UploadNotification = {
          id,
          userId,
          notificationType: "UploadCompleted",
          images: batch.items.filter((item) => item.status === "Success" && item.contentType.startsWith("image/")).length,
          videos: batch.items.filter((item) => item.status === "Success" && item.contentType.startsWith("video/")).length,
          failedFiles: batch.failedFiles,
          cancelledFiles: batch.cancelledFiles,
          createdAt: batch.completedAt ?? new Date().toISOString(),
          readAt: null,
        };
        return {
          items: [
            notification,
            ...state.items.filter((item) => item.userId === userId).slice(0, 49),
            ...state.items.filter((item) => item.userId !== userId),
          ],
        };
      }),
      addRemote: (userId, event) => set((state) => {
        const id = `upload:${event.ownerId}:${event.batchId}`;
        if (state.items.some((item) => item.id === id && item.userId === userId)) return state;
        return { items: [{ id, userId, notificationType: "UploadCompleted", createdAt: event.createdAt, readAt: null, username: event.username, images: event.images, videos: event.videos }, ...state.items.filter((item) => item.userId === userId).slice(0, 49), ...state.items.filter((item) => item.userId !== userId)] };
      }),
      markRead: (userId, id) => set((state) => ({
        items: state.items.map((item) =>
          item.userId === userId && (!id || item.id === id) && !item.readAt
            ? { ...item, readAt: new Date().toISOString() }
            : item),
      })),
    }),
    { name: "shinigacim-upload-notifications" },
  ),
);
