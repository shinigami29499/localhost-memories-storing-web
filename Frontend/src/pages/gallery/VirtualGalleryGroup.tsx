import { useCallback, useRef } from "react";
import { MediaTile } from "../../features/media/components/MediaTile";
import type { MediaFile } from "../../features/media/types";
import type { GalleryViewport } from "../../features/media/hooks/useGalleryWindow";
import { DayRow } from "./DayRow";

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
  active?: boolean;
}

export function VirtualGalleryGroup({ items, viewport, selectionMode, selectedItems, onSelect, onFavorite, favoriteBusy, onOpen, onUnavailable, mediaKind, pinnedId, includeDeleted = false, onReachEnd, active }: Props) {
  const handlers = useRef({ onSelect, onFavorite, onOpen, onUnavailable });
  handlers.current = { onSelect, onFavorite, onOpen, onUnavailable };
  const select = useCallback((id: string) => handlers.current.onSelect(id), []);
  const favorite = useCallback((id: string) => handlers.current.onFavorite?.(id), []);
  const open = useCallback((id: string) => handlers.current.onOpen(id), []);
  const unavailable = useCallback((id: string) => handlers.current.onUnavailable!(id), []);
  return <DayRow items={items} recycle fallbackWidth={viewport.width} mediaKind={mediaKind} pinnedId={pinnedId} onReachEnd={onReachEnd} active={active}
    renderItem={(item) => <MediaTile media={item} selectionMode={selectionMode} selectionDragEnabled selected={selectedItems.has(item.id)} includeDeleted={includeDeleted}
      onSelect={select} onFavorite={onFavorite ? favorite : undefined} favoriteDisabled={favoriteBusy} onOpen={open} onUnavailable={onUnavailable ? unavailable : undefined} />} />;
}
