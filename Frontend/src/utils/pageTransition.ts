export const PAGE_TRANSITION_EFFECTS = [
  "fade",
  "slide",
  "push",
  "zoom",
  "iris",
  "wipe",
  "bands",
  "stack",
  "flow",
  "chop",
  "random",
] as const;

export type PageTransitionEffect = (typeof PAGE_TRANSITION_EFFECTS)[number];

const storageKey = "shinigacim.page-transition";

export function isPageTransitionEffect(value: string): value is PageTransitionEffect {
  return PAGE_TRANSITION_EFFECTS.some((effect) => effect === value);
}

export function readPageTransitionEffect(): PageTransitionEffect {
  const stored = window.localStorage.getItem(storageKey);
  return stored && isPageTransitionEffect(stored) ? stored : "fade";
}

export function writePageTransitionEffect(effect: PageTransitionEffect) {
  window.localStorage.setItem(storageKey, effect);
}
