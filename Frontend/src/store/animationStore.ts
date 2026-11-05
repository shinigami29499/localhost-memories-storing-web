import { create } from "zustand";

const storageKey = "shinigacim.animations-enabled";

export const useAnimationStore = create<{
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  iconsEnabled: boolean;
  setIconsEnabled: (enabled: boolean) => void;
}>((set) => ({
  enabled: window.localStorage.getItem(storageKey) === "true",
  iconsEnabled: true,
  setEnabled: (enabled) => {
    window.localStorage.setItem(storageKey, String(enabled));
    set({ enabled });
  },
  setIconsEnabled: (iconsEnabled) => set({ iconsEnabled }),
}));
