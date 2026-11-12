import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";

function getScrollEdges(element: HTMLElement) {
  const maxScroll = element.scrollWidth - element.clientWidth;
  return {
    start: element.scrollLeft > 1,
    end: maxScroll - element.scrollLeft > 1,
  };
}

function subscribeToViewport(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function getViewportSize() {
  const viewport = document.documentElement;
  return `${viewport.clientWidth}:${viewport.clientHeight}`;
}

interface Props<T extends { id: string }> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  fallbackWidth?: number;
  pinnedId?: string | null;
  mediaKind?: string;
  onReachEnd?: () => void;
  active?: boolean;
  recycle?: boolean;
}

export function DayRow<T extends { id: string }>({ items, renderItem, fallbackWidth, pinnedId, mediaKind, onReachEnd, active, recycle = false }: Props<T>) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollEdges, setScrollEdges] = useState({ start: false, end: false });
  const [gridWidth, setGridWidth] = useState(0);
  const [nearViewport, setNearViewport] = useState(false);
  const committedSlots = useRef(new Map<string, number>());
  const frame = useRef<number | null>(null);
  const grid = gridRef.current;
  const viewportSize = useSyncExternalStore(subscribeToViewport, getViewportSize, () => "1200:800");
  const [screenWidth, screenHeight] = viewportSize.split(":").map(Number);
  const columns = screenWidth < 768 ? 3 : screenWidth >= 2400 ? 9 : screenWidth >= 1920 ? 8 : screenWidth >= 1600 ? 7 : 6;
  const gap = screenWidth < 768 ? 4 : 12;
  const width = gridWidth || Math.max(200, (fallbackWidth || screenWidth) - (screenWidth < 768 ? 0 : 48));
  const rowInset = screenWidth < 768 ? screenWidth * 0.01 : 8;
  const tileSize = Math.max(1, (width - 2 * rowInset - (columns - 1) * gap) / columns);
  const step = tileSize + gap;
  const tileHeight = tileSize * (screenWidth < 768 ? 3.95 : 3.75) / 3;
  const height = (screenWidth < 768 ? 16 : 32 - tileSize * 0.2 / 3) + tileHeight;
  const hoverInset = Math.max(8, Math.ceil(tileHeight * 0.045));
  const hoverHeight = tileHeight + 2 * hoverInset;
  const start = Math.max(0, Math.floor(scrollLeft / step) - (screenWidth < 768 ? 2 : 3));
  const end = Math.min(items.length, screenWidth < 768 ? start + 7 : Math.ceil((scrollLeft + width) / step) + 3);
  const rowActive = active ?? (!recycle || nearViewport);
  const rendered = (rowActive ? items.slice(start, end) : []).map((item, index) => ({ item, position: start + index }));
  const focusedId = typeof document === "undefined" ? null : document.activeElement?.getAttribute("data-media-id");
  for (const id of new Set([pinnedId, focusedId, focusTarget])) {
    if (!id) continue;
    const position = items.findIndex((item) => item.id === id);
    if (position >= 0 && (!rowActive || position < start || position >= end)) rendered.push({ item: items[position], position });
  }
  rendered.sort((a, b) => a.position - b.position);
  const slots = new Map<string, number>();
  const occupied = new Set<number>();
  for (const { item } of rendered) {
    const slot = committedSlots.current.get(item.id);
    if (slot !== undefined) {
      slots.set(item.id, slot);
      occupied.add(slot);
    }
  }
  let freeSlot = 0;
  for (const { item } of rendered) {
    if (slots.has(item.id)) continue;
    while (occupied.has(freeSlot)) freeSlot += 1;
    slots.set(item.id, freeSlot);
    occupied.add(freeSlot);
  }
  useLayoutEffect(() => { committedSlots.current = slots; });

  useEffect(() => {
    const element = gridRef.current;
    if (!element || !recycle || active !== undefined) return;
    const root = element.closest<HTMLElement>(".gallery-page__content");
    let observer: IntersectionObserver | undefined;
    const observe = () => {
      observer?.disconnect();
      observer = new IntersectionObserver(([entry]) => {
        if (entry) setNearViewport(entry.isIntersecting);
      }, { root, rootMargin: `${root?.clientHeight ?? window.innerHeight}px 0px` });
      observer.observe(element);
    };
    observe();
    const resize = new ResizeObserver(observe);
    if (root) resize.observe(root);
    return () => {
      observer?.disconnect();
      resize.disconnect();
    };
  }, [recycle, active]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  useLayoutEffect(() => {
    const element = gridRef.current;
    if (!element) return;
    setGridWidth(element.clientWidth);
    setScrollEdges(getScrollEdges(element));
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setGridWidth(entry.contentRect.width);
        setScrollEdges(getScrollEdges(element));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const element = gridRef.current;
    if (element) setScrollEdges(getScrollEdges(element));
  }, [items.length]);

  useLayoutEffect(() => {
    if (!focusTarget) return;
    const tile = Array.from(gridRef.current?.querySelectorAll<HTMLElement>("[data-media-id]") ?? [])
      .find((element) => element.dataset.mediaId === focusTarget);
    tile?.focus();
    if (tile) setFocusTarget(null);
  }, [focusTarget]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>("[data-media-id]") : null;
    const position = target ? items.findIndex((item) => item.id === target.dataset.mediaId) : -1;
    const next = position + (event.shiftKey ? -1 : 1);
    if (position < 0 || next < 0 || next >= items.length || rendered.some((entry) => entry.position === next)) return;
    event.preventDefault();
    if (grid) grid.scrollLeft = Math.max(0, next * step - rowInset);
    setFocusTarget(items[next].id);
  };

  const enterGroup = (position: number) => {
    grid?.scrollIntoView({ block: "nearest" });
    if (grid) grid.scrollLeft = Math.max(0, position * step - rowInset);
    setFocusTarget(items[position].id);
  };

  return <div className="gallery-day-row-shell" data-scroll-start={scrollEdges.start || undefined} data-scroll-end={scrollEdges.end || undefined}>
    <div ref={gridRef} className="gallery-date-grid gallery-date-grid--virtual gallery-day-row" data-media-kind={mediaKind}
      style={screenWidth < 768 ? undefined : { height: hoverHeight, marginTop: 8 - hoverInset, marginBottom: height - hoverHeight - (8 - hoverInset) }} onKeyDownCapture={handleKeyDown}
      onScroll={(event) => {
        const row = event.currentTarget;
        if (frame.current !== null) return;
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          setScrollLeft(row.scrollLeft);
          setScrollEdges(getScrollEdges(row));
          if (row.scrollWidth - row.scrollLeft - row.clientWidth <= row.clientWidth * 2.5) onReachEnd?.();
        });
      }}>
      <div aria-hidden="true" style={{ width: 2 * rowInset + items.length * step - gap, height: 1 }} />
      {items.length > 0 && rendered.length === 0 && <>
        <span tabIndex={0} aria-label="Enter media group" onFocus={() => enterGroup(0)} />
        <span tabIndex={0} aria-label="Enter media group from end" onFocus={() => enterGroup(items.length - 1)} />
      </>}
      {rendered.map(({ item, position }) => <div key={recycle ? slots.get(item.id) : item.id} className="gallery-window-cell" data-gallery-window-id={item.id} data-row-edge={position === 0 ? "start" : position === items.length - 1 ? "end" : undefined}
        style={{ width: tileSize, height: tileHeight, top: screenWidth < 768 ? screenHeight * 0.005 : hoverInset, left: rowInset + position * step }}>
        {renderItem(item)}
      </div>)}
    </div>
  </div>;
}
