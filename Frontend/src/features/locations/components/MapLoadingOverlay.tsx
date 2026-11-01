import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import { mediaViewerTransition } from "../../../components/layout/PageTransition";
import { Spinner } from "../../../components/ui";
import { useAnimationStore } from "../../../store/animationStore";
import { readPageTransitionEffect } from "../../../utils/pageTransition";

export function MapLoadingOverlay({ ready, className }: { ready: boolean; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const animationsEnabled = useAnimationStore((state) => state.enabled);

  useEffect(() => {
    if (!ready || !ref.current) return;
    if (!animationsEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(false);
      return;
    }

    const { enter } = mediaViewerTransition(ref.current, readPageTransitionEffect(), false);
    const { transition, ...target } = enter;
    const reversed = Object.fromEntries(Object.entries(target).map(([key, value]) => [key, Array.isArray(value) ? [...value].reverse() : value]));
    const animation = animate(ref.current, reversed, transition);
    void animation.then(() => setVisible(false));
    return () => animation.stop();
  }, [ready, animationsEnabled]);

  return visible ? <div ref={ref} className={className} style={{ pointerEvents: ready ? "none" : undefined }}><Spinner label="Loading map…" /></div> : null;
}
