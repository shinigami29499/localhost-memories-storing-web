import { useLayoutEffect, useState } from "react";

export function useMapPanelLoading(rendererEnabled: boolean) {
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    if (!rendererEnabled) setReady(false);
  }, [rendererEnabled]);
  return { ready: rendererEnabled && ready, setReady };
}
