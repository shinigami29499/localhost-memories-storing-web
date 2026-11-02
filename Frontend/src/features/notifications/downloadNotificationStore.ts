import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DownloadBatch } from "../downloads/services/downloadQueue";

export interface DownloadNotification {
  id: string;
  userId: string;
  notificationType: "DownloadCompleted";
  createdAt: string;
  readAt: string | null;
  successfulFiles: number;
  failedFiles: number;
}

interface DownloadNotificationState {
  items: DownloadNotification[];
  add: (userId: string, batch: DownloadBatch) => void;
  markRead: (userId: string, id?: string) => void;
}

export const useDownloadNotificationStore = create<DownloadNotificationState>()(persist((set) => ({
  items: [],
  add: (userId, batch) => set((state) => {
    if (!userId) return state;
    const id = `download:${userId}:${batch.id}`;
    if (state.items.some((item) => item.id === id)) return state;
    const successfulFiles = batch.items.filter((item) => item.status === "Sent to browser").length;
    const failedFiles = batch.items.filter((item) => item.status === "Failed").length;
    return {
      items: [
        { id, userId, notificationType: "DownloadCompleted", createdAt: new Date().toISOString(), readAt: null, successfulFiles, failedFiles },
        ...state.items.filter((item) => item.userId === userId).slice(0, 49),
        ...state.items.filter((item) => item.userId !== userId),
      ],
    };
  }),
  markRead: (userId, id) => set((state) => ({
    items: state.items.map((item) => item.userId === userId && (!id || item.id === id) && !item.readAt
      ? { ...item, readAt: new Date().toISOString() }
      : item),
  })),
}), { name: "shinigacim-download-notifications" }));
