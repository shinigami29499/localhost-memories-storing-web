import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UploadBatch } from "../uploads/types";

export interface UploadNotification {
  id: string;
  userId: string;
  notificationType: "UploadCompleted";
  postId: string | null;
  postCaption: string;
  createdAt: string;
  readAt: string | null;
}

interface UploadNotificationState {
  items: UploadNotification[];
  add: (userId: string, batch: UploadBatch) => void;
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
          postId: batch.postId,
          postCaption: batch.caption,
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
