import { useEffect, useState } from "react";
import { Spinner } from "../../../components/ui";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAnimationStore } from "../../../store/animationStore";

export function MapLoadingOverlay({ ready, className, closeDelay = 0 }: { ready: boolean; className: string; closeDelay?: number }) {
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

  if (ready && (finished || (exiting && (!animationsEnabled || reducedMotion)))) return null;
  return <div className={className} data-exiting={exiting || undefined} onAnimationEnd={(event) => {
    if (event.target === event.currentTarget && exiting) setFinished(true);
  }}><Spinner label="Loading map..." /></div>;
}
