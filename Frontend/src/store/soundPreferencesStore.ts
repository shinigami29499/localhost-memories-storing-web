import { create } from "zustand";

const storageKey = "shinigacim.sounds-enabled";

function readEnabled() {
  try {
    return window.localStorage.getItem(storageKey) === "true";
  } catch {
    return false;
  }
}

export const useSoundPreferencesStore = create<{
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}>((set) => ({
  enabled: readEnabled(),
  setEnabled: (enabled) => {
    try {
      window.localStorage.setItem(storageKey, String(enabled));
    } catch {
      // Keep the preference usable when browser storage is unavailable.
    }
    set({ enabled });
  },
}));
