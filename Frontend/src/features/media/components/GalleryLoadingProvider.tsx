import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode, RefObject } from "react";

const GalleryLoadingContext = createContext(true);

/** One listener covers both the vertical scrollport and horizontal day rows. */
export function GalleryLoadingProvider({
  containerRef, children,
}: {
  containerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const [idle, setIdle] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 140);
    };
    container.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll, true);
      clearTimeout(timer);
    };
  }, [containerRef]);

  return <GalleryLoadingContext.Provider value={idle}>{children}</GalleryLoadingContext.Provider>;
}

export function useGalleryLoadingAllowed() {
  return useContext(GalleryLoadingContext);
}
