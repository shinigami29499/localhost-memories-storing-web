import { useEffect, useState } from "react";
import { loadingPlaceholderDelayMs } from "@/features/ui-resources/uiOverlayPolicy";

export function useDelayedPlaceholder(pending = true, key?: string) {
  const [visible, setVisible] = useState<{ key?: string }>();

  useEffect(() => {
    setVisible(undefined);
    if (!pending) return;
    const timer = window.setTimeout(() => setVisible({ key }), loadingPlaceholderDelayMs);
    return () => window.clearTimeout(timer);
  }, [pending, key]);

  return pending && visible !== undefined && visible.key === key;
}
