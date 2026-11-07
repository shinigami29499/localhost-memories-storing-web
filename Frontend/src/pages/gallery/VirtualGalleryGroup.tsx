import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { MediaTile } from "../../features/media/components/MediaTile";
import type { MediaFile } from "../../features/media/types";
import type { GalleryViewport } from "../../features/media/hooks/useGalleryWindow";

interface Props {
  items: MediaFile[];
  viewport: GalleryViewport;
  selectionMode: boolean;
  selectedItems: ReadonlyMap<string, MediaFile> | ReadonlySet<string>;
  onSelect: (id: string) => void;
  onFavorite?: (id: string) => void;
  favoriteBusy: boolean;
  onOpen: (id: string) => void;
  onUnavailable?: (id: string) => Promise<boolean>;
  mediaKind?: string;
  pinnedId?: string | null;
  includeDeleted?: boolean;
  onReachEnd?: () => void;
}

export function VirtualGalleryGroup({ items, viewport, selectionMode, selectedItems, onSelect, onFavorite, favoriteBusy, onOpen, onUnavailable, mediaKind, pinnedId, includeDeleted = false, onReachEnd }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const grid = gridRef.current;
  const screenWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const columns = screenWidth < 768 ? 3 : screenWidth >= 2400 ? 9 : screenWidth >= 1920 ? 8 : screenWidth >= 1600 ? 7 : 6;
  const gap = screenWidth < 768 ? 4 : 12;
  const width = grid?.clientWidth || Math.max(200, viewport.width - 48);
  const tileSize = Math.max(1, (width - 16 - (columns - 1) * gap) / columns);
  const step = tileSize + gap;
  const tileHeight = tileSize * (screenWidth >= 768 ? 3.9 : 4.1) / 3;
  const height = (screenWidth < 768 ? 16 : 32) + tileHeight;
  const start = Math.max(0, Math.floor(scrollLeft / step) - 3);
  const end = Math.min(items.length, Math.ceil((scrollLeft + width) / step) + 3);
  const rendered = items.slice(start, end).map((item, index) => ({ item, position: start + index }));
  const focusedId = typeof document === "undefined" ? null : document.activeElement?.getAttribute("data-media-id");
  for (const id of new Set([pinnedId, focusedId, focusTarget])) {
    if (!id) continue;
    const position = items.findIndex((item) => item.id === id);
    if (position >= 0 && (position < start || position >= end)) {
      rendered.push({ item: items[position], position });
    }
  }
  rendered.sort((a, b) => a.position - b.position);

  useLayoutEffect(() => {
    if (!focusTarget) return;
    const tile = Array.from(gridRef.current?.querySelectorAll<HTMLButtonElement>("[data-media-id]") ?? [])
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
    if (grid) grid.scrollLeft = Math.max(0, next * step - 8);
    setFocusTarget(items[next].id);
  };

  const enterGroup = (position: number) => {
    if (grid) grid.scrollLeft = Math.max(0, position * step - 8);
    setFocusTarget(items[position].id);
  };

  return <div ref={gridRef} className="gallery-date-grid gallery-date-grid--virtual" data-media-kind={mediaKind}
    style={{ height }} onKeyDownCapture={handleKeyDown}
    onScroll={(event) => {
      const row = event.currentTarget;
      setScrollLeft(row.scrollLeft);
      if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 200) onReachEnd?.();
    }}>
    <div aria-hidden="true" style={{ width: 16 + items.length * step - gap, height: 1 }} />
    {items.length > 0 && rendered.length === 0 && <>
      <span tabIndex={0} aria-label="Enter media group" onFocus={() => enterGroup(0)} />
      <span tabIndex={0} aria-label="Enter media group from end" onFocus={() => enterGroup(items.length - 1)} />
    </>}
    {rendered.map(({ item, position }) => {
      return <div key={item.id} className="gallery-window-cell" data-gallery-window-id={item.id}
        style={{ width: tileSize, height: tileHeight, top: 8, left: 8 + position * step }}>
        <MediaTile media={item} preload selectionMode={selectionMode} selectionDragEnabled selected={selectedItems.has(item.id)} includeDeleted={includeDeleted}
          onSelect={onSelect} onFavorite={onFavorite} favoriteDisabled={favoriteBusy} onOpen={onOpen} onUnavailable={onUnavailable} />
      </div>;
    })}
  </div>;
}
