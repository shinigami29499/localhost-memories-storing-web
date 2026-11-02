import { useEffect, useState } from "react";
import type { RefObject } from "react";

export function useGalleryWindow(containerRef: RefObject<HTMLElement | null>, dependency: string, count: number) {
  const [windowIds, setWindowIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const cells = Array.from(containerRef.current?.querySelectorAll<HTMLElement>("[data-gallery-window-id]") ?? []);
        const viewport = containerRef.current?.querySelector<HTMLElement>(".gallery-page__content")?.getBoundingClientRect();
        if (!viewport || !cells.length) return;
        const first = cells.findIndex((cell) => cell.getBoundingClientRect().bottom >= viewport.top);
        if (first < 0) return;
        let last = first;
        while (last + 1 < cells.length && cells[last + 1].getBoundingClientRect().top <= viewport.bottom) last++;
        const before = Math.min(15, first);
        const after = Math.min(30 - before, cells.length - last - 1);
        const start = Math.max(0, first - (30 - after));
        const next = new Set(cells.slice(start, last + after + 1).map((cell) => cell.dataset.galleryWindowId!));
        setWindowIds((current) => current.size === next.size && [...next].every((id) => current.has(id)) ? current : next);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [containerRef, dependency, count]);
  return windowIds;
}
