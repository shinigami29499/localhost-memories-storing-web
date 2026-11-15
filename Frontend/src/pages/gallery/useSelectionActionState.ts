import { useIsPresent, useReducedMotion } from "motion/react";
import { useAnimationStore } from "../../store/animationStore";

export function useSelectionActionState() {
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  return { isPresent, duration: animationsEnabled && !reducedMotion ? 0.2 : 0 };
}
