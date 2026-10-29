import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

interface PreviewRetry {
  isFailed: () => boolean;
  retry: () => Promise<void>;
}

interface MediaRetryContextValue {
  register: (id: string, preview: PreviewRetry) => () => void;
  retryAll: (id: string) => Promise<void>;
  busy: boolean;
}

const MediaRetryContext = createContext<MediaRetryContextValue | null>(null);

export function MediaRetryProvider({ order, children }: { order: string[]; children: ReactNode }) {
  const previews = useRef(new Map<string, PreviewRetry>());
  const latestOrder = useRef(order);
  latestOrder.current = order;
  const running = useRef(false);
  const generation = useRef(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    generation.current += 1;
    running.current = false;
  }, []);

  const register = useCallback((id: string, preview: PreviewRetry) => {
    previews.current.set(id, preview);
    return () => {
      if (previews.current.get(id) === preview) previews.current.delete(id);
    };
  }, []);

  const retryAll = useCallback(async (id: string) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    const currentGeneration = generation.current;
    const queue = [id, ...latestOrder.current.filter((item) => item !== id && previews.current.get(item)?.isFailed())];
    try {
      for (const item of queue) {
        if (generation.current !== currentGeneration) break;
        const preview = previews.current.get(item);
        if (preview?.isFailed()) await preview.retry();
      }
    } finally {
      if (generation.current === currentGeneration) {
        running.current = false;
        setBusy(false);
      }
    }
  }, []);

  const value = useMemo(() => ({ register, retryAll, busy }), [register, retryAll, busy]);
  return <MediaRetryContext.Provider value={value}>{children}</MediaRetryContext.Provider>;
}

export function useMediaRetry() {
  return useContext(MediaRetryContext);
}
