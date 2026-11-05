import { useEffect, useState } from "react";
import type { RefObject } from "react";

export interface GalleryViewport {
  top: number;
  height: number;
  width: number;
}

/** One passive scroll listener for the gallery, independent of the media count. */
export function useGalleryWindow(containerRef: RefObject<HTMLElement | null>, dependency: string): GalleryViewport {
  const [viewport, setViewport] = useState<GalleryViewport>({ top: 0, height: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const scrollport = container?.matches(".gallery-page__content")
      ? container : container?.querySelector<HTMLElement>(".gallery-page__content");
    if (!scrollport) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = { top: scrollport.scrollTop, height: scrollport.clientHeight, width: scrollport.clientWidth };
        setViewport((current) => current.top === next.top && current.height === next.height && current.width === next.width ? current : next);
      });
    };
    update();
    scrollport.addEventListener("scroll", update, { passive: true });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    resize?.observe(scrollport);
    return () => {
      cancelAnimationFrame(frame);
      scrollport.removeEventListener("scroll", update);
      resize?.disconnect();
    };
  }, [containerRef, dependency]);

  return viewport;
}
