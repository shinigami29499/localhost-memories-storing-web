import { useEffect, useState } from "react";
import { UI_TIMING } from "../config/uiTiming";

export function useDelayedPlaceholder(pending = true, key?: string) {
  const [visible, setVisible] = useState<{ key?: string }>();

  useEffect(() => {
    setVisible(undefined);
    if (!pending) return;
    const timer = window.setTimeout(() => setVisible({ key }), UI_TIMING.SKELETON_SHOW_DELAY);
    return () => window.clearTimeout(timer);
  }, [pending, key]);

  return pending && visible !== undefined && visible.key === key;
}
