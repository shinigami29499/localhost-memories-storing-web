import { create } from "zustand";

interface UserPresence {
  online: boolean;
  lastSeenAt: string | null;
}

interface UserPresenceState {
  presenceByUser: Partial<Record<string, UserPresence>>;
  setOnline: (userId: string, online: boolean, lastSeenAt?: string | null) => void;
  clear: () => void;
}

export const useUserPresenceStore = create<UserPresenceState>((set) => ({
  presenceByUser: {},
  setOnline: (userId, online, lastSeenAt = null) => set((state) => {
    const previous = state.presenceByUser[userId];
    if (lastSeenAt && previous?.lastSeenAt && Date.parse(lastSeenAt) < Date.parse(previous.lastSeenAt)) {
      return state;
    }
    return { presenceByUser: { ...state.presenceByUser, [userId]: { online, lastSeenAt } } };
  }),
  clear: () => set({ presenceByUser: {} }),
}));
