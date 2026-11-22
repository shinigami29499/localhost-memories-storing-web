import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDelayedPlaceholder } from "../../../hooks/useDelayedPlaceholder";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAnimationStore } from "../../../store/animationStore";

export function useMapLoadingState(ready: boolean, closeDelay: number) {
  const visible = useDelayedPlaceholder(!ready);
  const wasVisible = useRef(false);
  useLayoutEffect(() => { if (visible) wasVisible.current = true; }, [visible]);
  const [delayElapsed, setDelayElapsed] = useState(false);
  const [finished, setFinished] = useState(ready && closeDelay === 0);
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const exiting = ready && (closeDelay === 0 || delayElapsed);

  useEffect(() => {
    if (!ready) {
      setDelayElapsed(false);
      setFinished(false);
      return;
    }
    if (closeDelay === 0) return;
    const timeout = window.setTimeout(() => setDelayElapsed(true), closeDelay);
    return () => window.clearTimeout(timeout);
  }, [ready, closeDelay]);

  const hidden = (!visible && !wasVisible.current) ||
    (ready && (finished || (exiting && (!animationsEnabled || reducedMotion))));
  return { exiting, setFinished, hidden };
}
