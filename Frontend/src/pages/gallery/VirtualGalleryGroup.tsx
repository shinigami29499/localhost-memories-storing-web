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
}

export function VirtualGalleryGroup({ items, viewport, selectionMode, selectedItems, onSelect, onFavorite, favoriteBusy, onOpen, onUnavailable, mediaKind, pinnedId, includeDeleted = false }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const grid = gridRef.current;
  const screenWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const columns = screenWidth < 641 ? 4 : screenWidth >= 2400 ? 9 : screenWidth >= 1920 ? 8 : screenWidth >= 1600 ? 7 : 6;
  const gap = screenWidth < 641 ? 4 : 12;
  const width = grid?.clientWidth || Math.max(200, viewport.width - 48);
  const tileSize = Math.max(1, (width - 16 - (columns - 1) * gap) / columns);
  const step = tileSize + gap;
  const rows = Math.ceil(items.length / columns);
  const height = rows ? 16 + rows * tileSize + (rows - 1) * gap : 0;
  const scrollport = grid?.closest<HTMLElement>(".gallery-page__content");
  const groupTop = grid && scrollport
    ? grid.getBoundingClientRect().top - scrollport.getBoundingClientRect().top + scrollport.scrollTop
    : 0;
  const firstRow = viewport.height > 0 ? Math.max(0, Math.floor((viewport.top - groupTop) / step) - 3) : 0;
  const lastRow = viewport.height > 0
    ? Math.min(rows, Math.ceil((viewport.top + viewport.height - groupTop) / step) + 3)
    : Math.min(rows, 8);
  const start = Math.min(items.length, firstRow * columns);
  const end = Math.max(start, Math.min(items.length, lastRow * columns));
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
    if (scrollport) scrollport.scrollTop = Math.max(0, groupTop + Math.floor(next / columns) * step - 8);
    setFocusTarget(items[next].id);
  };

  const enterGroup = (position: number) => {
    if (scrollport) scrollport.scrollTop = Math.max(0, groupTop + Math.floor(position / columns) * step - 8);
    setFocusTarget(items[position].id);
  };

  return <div ref={gridRef} className="gallery-date-grid gallery-date-grid--virtual" data-media-kind={mediaKind}
    style={{ height }} onKeyDownCapture={handleKeyDown}>
    {items.length > 0 && rendered.length === 0 && <>
      <span tabIndex={0} aria-label="Enter media group" onFocus={() => enterGroup(0)} />
      <span tabIndex={0} aria-label="Enter media group from end" onFocus={() => enterGroup(items.length - 1)} />
    </>}
    {rendered.map(({ item, position }) => {
      return <div key={item.id} className="gallery-window-cell" data-gallery-window-id={item.id}
        style={{ width: tileSize, height: tileSize, top: 8 + Math.floor(position / columns) * step, left: 8 + position % columns * step }}>
        <MediaTile media={item} preload selectionMode={selectionMode} selectionDragEnabled selected={selectedItems.has(item.id)} includeDeleted={includeDeleted}
          onSelect={onSelect} onFavorite={onFavorite} favoriteDisabled={favoriteBusy} onOpen={onOpen} onUnavailable={onUnavailable} />
      </div>;
    })}
  </div>;
}
