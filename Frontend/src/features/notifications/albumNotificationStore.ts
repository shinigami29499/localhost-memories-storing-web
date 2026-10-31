import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AlbumNotification {
  eventId: string;
  albumId: string;
  albumName: string;
  ownerId: string;
  username: string;
  created: boolean;
  createdAt: string;
  userId: string;
  readAt: string | null;
}

interface AlbumNotificationState {
  items: AlbumNotification[];
  add: (userId: string, event: Omit<AlbumNotification, "userId" | "readAt">) => void;
  markRead: (userId: string) => void;
}

export const useAlbumNotificationStore = create<AlbumNotificationState>()(persist((set) => ({
  items: [],
  add: (userId, event) => set((state) => {
    if (state.items.some((item) => item.userId === userId && item.eventId === event.eventId)) return state;
    return { items: [{ ...event, userId, readAt: null }, ...state.items.filter((item) => item.userId === userId).slice(0, 49), ...state.items.filter((item) => item.userId !== userId)] };
  }),
  markRead: (userId) => set((state) => ({ items: state.items.map((item) =>
    item.userId === userId && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item) })),
}), { name: "shinigacim-album-notifications" }));
