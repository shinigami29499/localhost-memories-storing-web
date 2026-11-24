import { useLayoutEffect, useRef, useState } from "react";
import { useLoadingOverlay } from "../../../hooks/useLoadingOverlay";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAnimationStore } from "../../../store/animationStore";

export function useMapLoadingState(ready: boolean) {
  const visible = useLoadingOverlay(!ready);
  const wasVisible = useRef(false);
  const [finished, setFinished] = useState(false);
  useLayoutEffect(() => {
    if (visible || !ready) wasVisible.current = visible;
    if (!ready) setFinished(false);
  }, [ready, visible]);
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const exiting = ready && !visible && wasVisible.current;
  const hidden = !visible && (!exiting || finished || !animationsEnabled || reducedMotion);
  return { exiting, setFinished, hidden };
}
