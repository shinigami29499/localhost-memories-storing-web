import { create } from "zustand";
import type { ClickVariant } from "@animate-ui/react/primitives/effects/click";

export const CLICK_ANIMATION_EFFECTS = [
  "off",
  "ring",
  "ripple",
  "crosshair",
  "burst",
  "particles",
] as const satisfies readonly ("off" | ClickVariant)[];

export type ClickAnimationEffect = (typeof CLICK_ANIMATION_EFFECTS)[number];

const storageKey = "shinigacim.click-animation";

export function isClickAnimationEffect(value: string): value is ClickAnimationEffect {
  return CLICK_ANIMATION_EFFECTS.some((effect) => effect === value);
}

function readClickAnimationEffect(): ClickAnimationEffect {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === null) return "off";
    if (isClickAnimationEffect(stored)) return stored;
    console.warn("Invalid stored click animation preference.");
  } catch (error) {
    console.error("Could not read click animation preference.", error);
  }
  return "off";
}

interface ClickAnimationState {
  effect: ClickAnimationEffect;
  setEffect: (effect: ClickAnimationEffect) => void;
}

export const useClickAnimationStore = create<ClickAnimationState>((set) => ({
  effect: readClickAnimationEffect(),
  setEffect: (effect) => {
    window.localStorage.setItem(storageKey, effect);
    set({ effect });
  },
}));
