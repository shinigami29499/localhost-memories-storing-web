import { create } from "zustand";

const storageKey = "shinigacim.animations-enabled";
const iconStorageKey = "shinigacim.icon-animations-enabled";

export const useAnimationStore = create<{
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  iconsEnabled: boolean;
  setIconsEnabled: (enabled: boolean) => void;
}>((set) => ({
  enabled: window.localStorage.getItem(storageKey) !== "false",
  iconsEnabled: window.localStorage.getItem(iconStorageKey) !== "false",
  setEnabled: (enabled) => {
    window.localStorage.setItem(storageKey, String(enabled));
    set({ enabled });
  },
  setIconsEnabled: (enabled) => {
    window.localStorage.setItem(iconStorageKey, String(enabled));
    set({ iconsEnabled: enabled });
  },
}));
