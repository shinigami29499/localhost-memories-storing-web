import { useEffect, useState } from "react";
import { Spinner } from "../../../components/ui";

export function MapLoadingOverlay({ ready, className, closeDelay = 0 }: { ready: boolean; className: string; closeDelay?: number }) {
  const [delayElapsed, setDelayElapsed] = useState(false);
  useEffect(() => {
    if (!ready) {
      setDelayElapsed(false);
      return;
    }
    const timeout = window.setTimeout(() => setDelayElapsed(true), closeDelay);
    return () => window.clearTimeout(timeout);
  }, [ready, closeDelay]);
  if (ready && (closeDelay === 0 || delayElapsed)) return null;
  return <div className={className}><Spinner label="Loading map…" /></div>;
}
