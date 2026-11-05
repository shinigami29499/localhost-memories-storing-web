import type { LibrarySoundName } from "react-sounds";
import { useSoundPreferencesStore } from "../store/soundPreferencesStore";

export function playUiSound(name: LibrarySoundName) {
  if (!useSoundPreferencesStore.getState().enabled || document.visibilityState === "hidden") return;

  void import("react-sounds").then((sounds) => {
    if (!useSoundPreferencesStore.getState().enabled) return;
    if (!sounds.isSoundEnabled()) sounds.setSoundEnabled(true);
    return sounds.playSound(name, { volume: 0.25 });
  }).catch(() => {
    // Audio availability must never interrupt the action that triggered it.
  });
}
