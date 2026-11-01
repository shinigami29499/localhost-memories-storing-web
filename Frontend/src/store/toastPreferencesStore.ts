import { create } from "zustand";

const storageKey = "shinigacim.toasts-enabled";

export const useToastPreferencesStore = create<{
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}>((set) => ({
  enabled: window.localStorage.getItem(storageKey) !== "false",
  setEnabled: (enabled) => {
    window.localStorage.setItem(storageKey, String(enabled));
    set({ enabled });
  },
}));
