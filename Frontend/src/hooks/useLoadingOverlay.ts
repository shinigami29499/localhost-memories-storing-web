import { useLayoutEffect, useRef, useState } from "react";
import { UI_TIMING } from "../config/uiTiming";

/** Pass the combined pending state for all work covered by this overlay. */
export function useLoadingOverlay(pending: boolean) {
  const [visible, setVisible] = useState(false);
  const visibleAt = useRef(0);

  useLayoutEffect(() => {
    if (visible) visibleAt.current = performance.now();
  }, [visible]);

  useLayoutEffect(() => {
    if (pending === visible) return;
    const delay = pending ? UI_TIMING.LOADING_SHOW_DELAY
      : Math.max(0, UI_TIMING.LOADING_MIN_VISIBLE - (performance.now() - visibleAt.current));
    if (delay === 0) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(pending), Math.ceil(delay));
    return () => window.clearTimeout(timer);
  }, [pending, visible]);

  return visible;
}
