import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../components/ui/Toast";
import { UI_TIMING } from "../../config/uiTiming";
import { useLocale } from "../../context/LocaleContext";
import {
  albumKeys,
  useAlbum,
  useInfiniteAlbumMedia,
  useInvalidateAlbums,
} from "../../features/albums/hooks/useAlbums";
import { albumService } from "../../features/albums/services/albumService";
import { useAlbumUpload } from "../../features/albums/hooks/useAlbumUpload";
import type { Album } from "../../features/albums/types";
import { useMediaSelectionDrag } from "../../features/media/hooks/useMediaSelectionDrag";
import { mediaService } from "../../features/media/services/mediaService";
import type { MediaFile, MediaKindFilter } from "../../features/media/types";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ApiError } from "../../services/api";
import { useAnimationStore } from "../../store/animationStore";
import { useAuthStore } from "../../store/authStore";
import { resolveFocusMediaId } from "../gallery/resolveFocusMediaId";

function updateFavoriteData<T>(data: T, mediaIds: ReadonlySet<string>, isFavorited: boolean): T {
  if (!data || typeof data !== "object") return data;
  const value = data as { items?: MediaFile[]; pages?: { items: MediaFile[] }[] };
  const updateItems = (items: MediaFile[]) => items.map((item) => mediaIds.has(item.id)
    ? { ...item, isFavorited }
    : item);
  if (Array.isArray(value.pages)) {
    return { ...value, pages: value.pages.map((page) => ({ ...page, items: updateItems(page.items) })) } as T;
  }
  if (Array.isArray(value.items))
    return { ...value, items: updateItems(value.items) } as T;
  return data;
}

export function useAlbumDetail(albumId: string | undefined) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const filterTransition = useRef<{ positions: Map<string, DOMRect>; copies: Map<string, HTMLElement> } | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, MediaFile>>(() => new Map());
  const [removingSelection, setRemovingSelection] = useState(false);
  const [bulkFavoriteBusy, setBulkFavoriteBusy] = useState(false);
  const [favoriteBusyMediaId, setFavoriteBusyMediaId] = useState<string | null>(null);
  const [showImages, setShowImages] = useState(true);
  const [showVideos, setShowVideos] = useState(true);
  const mediaKind: MediaKindFilter | undefined = showImages === showVideos ? undefined : showImages ? "image" : "video";
  const hasMediaFilter = showImages || showVideos;
  const requestedFilter = hasMediaFilter ? mediaKind : "none";
  const debouncedFilter = useDebouncedValue(requestedFilter, UI_TIMING.FILTER_DEBOUNCE);
  const mediaFilterReady = hasMediaFilter && requestedFilter === debouncedFilter;
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
  const returnToMediaId = useRef<string | null>(null);
  const returnToIndex = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const album = useAlbum(albumId);

  const media = useInfiniteAlbumMedia(albumId, 20, album.isSuccess && mediaFilterReady, mediaKind);
  const invalidate = useInvalidateAlbums();
  const items = media.data?.pages.flatMap((page) => page.items) ?? [];
  useEffect(() => () => {
    filterTransition.current?.copies.forEach((copy) => copy.remove());
  }, []);

  useLayoutEffect(() => {
    const transition = filterTransition.current;
    if (!transition || (hasMediaFilter && media.isPending)) return;
    filterTransition.current = null;
    const viewport = contentRef.current?.getBoundingClientRect();
    if (!media.isError && viewport) {
      for (const cell of contentRef.current?.querySelectorAll<HTMLElement>("[data-album-media-id]") ?? []) {
        const rect = cell.getBoundingClientRect();
        if (rect.right <= viewport.left || rect.left >= viewport.right || rect.bottom <= viewport.top || rect.top >= viewport.bottom) continue;
        const id = cell.dataset.albumMediaId ?? "";
        const previous = transition.positions.get(id);
        if (!previous) {
          cell.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: "ease-out" });
          continue;
        }
        transition.copies.get(id)?.remove();
        transition.copies.delete(id);
        const x = previous.left - rect.left;
        const y = previous.top - rect.top;
        if (x || y) cell.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: "translate(0, 0)" }],
          { duration: 280, easing: "cubic-bezier(.2, .8, .2, 1)" });
      }
    }
    transition.copies.forEach((copy) => {
      copy.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: "ease-out" }).onfinish = () => copy.remove();
    });
  }, [showImages, showVideos, hasMediaFilter, media.isPending, media.isError, media.data]);

  const changeFilter = (images: boolean, videos: boolean) => {
    const kind: MediaKindFilter | undefined = images === videos ? undefined : images ? "image" : "video";
    filterTransition.current?.copies.forEach((copy) => copy.remove());
    filterTransition.current = null;
    if (animationsEnabled && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && albumId
      && (!(images || videos) || queryClient.getQueryData(albumKeys.infiniteMedia(albumId, 20, kind)))) {
      const positions = new Map<string, DOMRect>();
      const copies = new Map<string, HTMLElement>();
      const viewport = contentRef.current?.getBoundingClientRect();
      for (const cell of contentRef.current?.querySelectorAll<HTMLElement>("[data-album-media-id]") ?? []) {
        const rect = cell.getBoundingClientRect();
        if (!viewport || rect.right <= viewport.left || rect.left >= viewport.right || rect.bottom <= viewport.top || rect.top >= viewport.bottom) continue;
        const id = cell.dataset.albumMediaId ?? "";
        positions.set(id, rect);
        const copy = cell.cloneNode(true) as HTMLElement;
        copy.setAttribute("aria-hidden", "true");
        copy.inert = true;
        Object.assign(copy.style, { position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`,
          height: `${rect.height}px`, margin: "0", pointerEvents: "none", zIndex: "10" });
        document.body.appendChild(copy);
        copies.set(id, copy);
      }
      filterTransition.current = { positions, copies };
    }
    setShowImages(images);
    setShowVideos(videos);
  };
  useEffect(() => {
    if (previewMediaId || !returnToMediaId.current) return;
    if (media.isFetching && !items.some((item) => item.id === returnToMediaId.current)) return;
    const focusId = resolveFocusMediaId(items, returnToMediaId.current, returnToIndex.current);
    if (!focusId && !media.hasNextPage) {
      returnToMediaId.current = null;
      contentRef.current?.focus({ preventScroll: true });
      return;
    }
    const tile = Array.from(contentRef.current?.querySelectorAll<HTMLButtonElement>("[data-media-id]") ?? [])
      .find((element) => element.dataset.mediaId === focusId);
    if (!tile) return;
    returnToMediaId.current = null;
    tile.focus({ preventScroll: true });
    tile.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
  }, [previewMediaId, items, media.isFetching, media.hasNextPage]);
  const total = media.data?.pages[0]?.total ?? 0;
  const isOwner = Boolean(album.data && me && album.data.owner.id === me.id);
  const upload = useAlbumUpload(album.isSuccess ? album.data : undefined);
  const selectedMedia = [...selectedItems.values()];
  const allSelectedFavorited = selectedMedia.length > 0 && selectedMedia.every((item) => item.isFavorited);
  const cancelSelection = () => { setSelectionMode(false); setSelectedItems(new Map()); };
  const setSelected = (id: string, selected: boolean) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    setSelectionMode(true);
    setSelectedItems((current) => { const next = new Map(current); if (selected) next.set(id, item); else next.delete(id); return next; });
  };
  const selectionDragHandlers = useMediaSelectionDrag(!previewMediaId && !editing && !editingCaption && !deleting && !removingSelection && !bulkFavoriteBusy, selectionMode, (id) => selectedItems.has(id), setSelected);

  useEffect(() => {
    if (!selectionMode || editing || editingCaption || deleting || removingSelection || bulkFavoriteBusy || previewMediaId) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); cancelSelection(); } };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectionMode, editing, editingCaption, deleting, removingSelection, bulkFavoriteBusy, previewMediaId]);

  useEffect(() => {
    const root = contentRef.current;
    const sentinel = sentinelRef.current;
    if (
      previewMediaId || !mediaFilterReady || !root || !sentinel || !media.hasNextPage
      || media.isFetching || media.isFetchNextPageError
    ) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void media.fetchNextPage({ cancelRefetch: false });
      }
    }, { root, rootMargin: "0px 0px 400px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    previewMediaId,
    mediaFilterReady,
    media.fetchNextPage,
    media.hasNextPage,
    media.isFetchNextPageError,
    media.isFetching,
  ]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    setPreviewMediaId(null);
    cancelSelection();
  }, [showImages, showVideos]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const removeSelected = async () => {
    if (!albumId || !isOwner || selectedMedia.length === 0) return;
    try {
      await albumService.removeMediaBatch(albumId, selectedMedia.map((item) => item.id));
      cancelSelection();
      showToast.delete(t("Media deleted from album"));
    } finally {
      await invalidate(true);
    }
  };

  const favoriteSelected = async () => {
    if (selectedMedia.length === 0) return;
    setBulkFavoriteBusy(true);
    try {
      const favorite = !allSelectedFavorited;
      const ids = selectedMedia.filter((item) => item.isFavorited !== favorite).map((item) => item.id);
      if (ids.length > 0) {
        await mediaService.setFavorites(ids, favorite);
        const changedIds = new Set(ids);
        setSelectedItems((current) => {
          const next = new Map(current);
          for (const id of changedIds) {
            const item = next.get(id);
            if (item) next.set(id, { ...item, isFavorited: favorite });
          }
          return next;
        });
        queryClient.setQueriesData({ queryKey: albumKeys.detail(albumId ?? "") }, (data: unknown) =>
          updateFavoriteData(data, changedIds, favorite));
        queryClient.setQueriesData({ queryKey: ["media"] }, (data: unknown) =>
          updateFavoriteData(data, changedIds, favorite));
        queryClient.setQueryData<Album>(albumKeys.detail(albumId ?? ""), (current) => current?.previewMediaId && changedIds.has(current.previewMediaId)
          ? { ...current, previewIsFavorited: favorite }
          : current);
      }
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not update favorites."));
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      setBulkFavoriteBusy(false);
    }
  };

  const toggleFavorite = async (mediaId: string, isFavorited: boolean) => {
    if (favoriteBusyMediaId !== null) return;
    setFavoriteBusyMediaId(mediaId);
    try {
      if (isFavorited) await mediaService.unfavorite(mediaId);
      else await mediaService.favorite(mediaId);
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await invalidate();
    } catch (err) {
      showToast.error(err instanceof ApiError ? err.message : t("Could not update favorites."));
    } finally {
      setFavoriteBusyMediaId(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      showToast.success(t("Link copy success"));
    } catch {
      showToast.error(t("Could not copy the link."));
    }
  };

  const saveCaption = async (caption: string) => {
    if (!albumId) return;
    await albumService.updateCaption(albumId, caption);
    await invalidate();
  };

  return { t, navigate, copied, editing, setEditing, editingCaption, setEditingCaption, deleting, setDeleting, selectionMode, selectedItems, removingSelection, setRemovingSelection, bulkFavoriteBusy, favoriteBusyMediaId, showImages, showVideos, mediaKind, hasMediaFilter, previewMediaId, setPreviewMediaId, returnToMediaId, returnToIndex, contentRef, sentinelRef, album, media, invalidate, items, total, isOwner, selectedMedia, allSelectedFavorited, cancelSelection, setSelected, selectionDragHandlers, changeFilter, removeSelected, ...upload, favoriteSelected, toggleFavorite, copyLink, saveCaption };
}
