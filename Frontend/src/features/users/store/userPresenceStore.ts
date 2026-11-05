import { create } from "zustand";

interface UserPresenceState {
  offlineUsers: Record<string, boolean>;
  setOnline: (userId: string, online: boolean) => void;
  clear: () => void;
}

export const useUserPresenceStore = create<UserPresenceState>((set) => ({
  offlineUsers: {},
  setOnline: (userId, online) => set((state) => ({
    offlineUsers: { ...state.offlineUsers, [userId]: !online },
  })),
  clear: () => set({ offlineUsers: {} }),
}));
