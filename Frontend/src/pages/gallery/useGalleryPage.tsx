import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../components/ui/Toast";
import { useLocale } from "../../context/LocaleContext";
import { albumKeys, useAlbumMembership } from "../../features/albums/hooks/useAlbums";
import { useGalleryWindow } from "../../features/media/hooks/useGalleryWindow";
import { mediaQueryOptions } from "../../features/media/hooks/useMedia";
import { useMediaSelectionDrag } from "../../features/media/hooks/useMediaSelectionDrag";
import { mediaService } from "../../features/media/services/mediaService";
import type { MediaFile, MediaKindFilter } from "../../features/media/types";
import { placeKeys } from "../../features/place/hooks/usePlaces";
import { uploadService } from "../../features/uploads/services/uploadService";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useAnimationStore } from "../../store/animationStore";
import { useAuthStore } from "../../store/authStore";
import { resolveFocusMediaId } from "./resolveFocusMediaId";

export type GalleryView = "pictures" | "favorites";

let favoriteTransition: { destination: GalleryView; positions: Map<string, DOMRect>; copies: Map<string, HTMLElement> } | null = null;

function isVisibleCell(cell: HTMLElement): boolean {
  const rect = cell.getBoundingClientRect();
  const row = cell.closest<HTMLElement>(".gallery-day-row")?.getBoundingClientRect();
  const scrollport = cell.closest<HTMLElement>(".gallery-page__content")?.getBoundingClientRect();
  return [row, scrollport, { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }]
    .every((bounds) => !bounds || (rect.right > bounds.left && rect.left < bounds.right && rect.bottom > bounds.top && rect.top < bounds.bottom));
}

const viewCopy: Record<GalleryView, { title: string; description: string; emptyTitle: string; emptyHint: string }> = {
  pictures: {
    title: "Gallery",
    description: "Browse images and videos in your library.",
    emptyTitle: "No media yet",
    emptyHint: "Uploaded images and videos will appear here.",
  },
  favorites: {
    title: "Favorites",
    description: "Images and videos you have favorited.",
    emptyTitle: "No favorites yet",
    emptyHint: "Tap the heart on an image or video to add it here.",
  },
};



/** Applies favorite state in small batches and returns the media ids that failed. */
async function applyFavorites(mediaIds: string[], favorite: boolean) {
  if (mediaIds.length > 0) await mediaService.setFavorites(mediaIds, favorite);
}

export function useGalleryPage({ view = "pictures", initialFilter }: { view?: GalleryView; initialFilter?: MediaKindFilter }) {
  const { t, language } = useLocale();
  const isAdmin = useAuthStore((state) => ["admin", "superadmin"].includes(state.user?.role?.toLowerCase() ?? ""));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const selectedFilter = initialFilter;
  const [uploading, setUploading] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, MediaFile>>(() => new Map());
  const selectedIds = [...selectedItems.keys()];
  const membership = useAlbumMembership(selectedIds);
  const inAlbum = membership.data?.items.some((item) => item.albumIds.length > 0) ?? false;
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [missingMedia, setMissingMedia] = useState<MediaFile[] | null>(null);
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);
  const [bulkFavoriteBusy, setBulkFavoriteBusy] = useState(false);
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
  const [previewGroupKey, setPreviewGroupKey] = useState<string | null>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  const galleryRef = useRef<HTMLElement>(null);
  const returnToMediaId = useRef<string | null>(null);
  const returnToIndex = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const showingFavorites = view === "favorites";
  const mobile = useMediaQuery("(max-width: 767px)");
  const pageSize = mobile ? 5 : 20;
  const query = useInfiniteQuery({ ...mediaQueryOptions(pageSize, showingFavorites ? "favorites" : "all", selectedFilter), staleTime: 0 });
  const viewport = useGalleryWindow(galleryRef, `${view}:${selectedFilter}`, false);

  const media = useMemo(
    () => (Array.isArray(query.data?.pages) ? query.data.pages : [])
      .filter((page) => page && Array.isArray(page.items)).flatMap((page) => page.items),
    [query.data],
  );
  const focusMediaId = resolveFocusMediaId(media, returnToMediaId.current, returnToIndex.current);
  const groups = useMemo(() => {
    const byDate = new Map<string, { date: Date; items: MediaFile[] }>();
    for (const item of media) {
      const date = new Date(item.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const group = byDate.get(key);
      if (group) group.items.push(item);
      else byDate.set(key, { date, items: [item] });
    }
    return [...byDate.entries()].sort(([, a], [, b]) => b.date.getTime() - a.date.getTime());
  }, [media]);

  useEffect(() => {
    const scrollport = galleryRef.current?.querySelector<HTMLElement>(".gallery-page__content");
    if (!scrollport) return;
    const updateScrollCue = () => {
      setHasMoreBelow(scrollport.scrollHeight - scrollport.scrollTop - scrollport.clientHeight > 1);
    };
    updateScrollCue();
    scrollport.addEventListener("scroll", updateScrollCue, { passive: true });
    const observer = new ResizeObserver(updateScrollCue);
    observer.observe(scrollport);
    const content = scrollport.firstElementChild;
    if (content) observer.observe(content);
    return () => {
      scrollport.removeEventListener("scroll", updateScrollCue);
      observer.disconnect();
    };
  }, [groups.length, media.length, query.isPending]);

  const previewGroup = groups.find(([key]) => key === previewGroupKey);
  const previewItems = previewGroup?.[1].items ?? [];
  const previewNeedsMore = Boolean(previewGroup && previewGroup[0] === groups[groups.length - 1]?.[0] && query.hasNextPage);

  useEffect(() => {
    if (previewNeedsMore && !query.isFetching && !query.isFetchNextPageError) {
      void query.fetchNextPage({ cancelRefetch: false });
    }
  }, [previewNeedsMore, query.isFetching, query.isFetchNextPageError, query.fetchNextPage]);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(language, { month: "short", day: "numeric" }),
    [language],
  );
  const copy = viewCopy[view];
  const selectedMedia = [...selectedItems.values()];
  const allSelectedFavorited = selectedMedia.length > 0 && selectedMedia.every((item) => item.isFavorited);
  const favoriteBusy = favoriteBusyId !== null || bulkFavoriteBusy;

  useLayoutEffect(() => {
    if (query.isPending || !favoriteTransition || favoriteTransition.destination !== view || !viewport.width) return;
    const { positions, copies } = favoriteTransition;
    favoriteTransition = null;
    if (query.isError) {
      copies.forEach((copy) => copy.remove());
      return;
    }
    for (const cell of galleryRef.current?.querySelectorAll<HTMLElement>("[data-gallery-window-id]") ?? []) {
      if (!isVisibleCell(cell)) continue;
      const id = cell.dataset.galleryWindowId ?? "";
      const previous = positions.get(id);
      if (!previous) {
        cell.animate([{ opacity: 0 }, { opacity: 1 }],
          { duration: 280, easing: "ease-out" });
        continue;
      }
      copies.get(id)?.remove();
      copies.delete(id);
      const current = cell.getBoundingClientRect();
      const x = previous.left - current.left;
      const y = previous.top - current.top;
      if (x || y) cell.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: "translate(0, 0)" }],
        { duration: 280, easing: "cubic-bezier(.2, .8, .2, 1)" });
    }
    copies.forEach((copy) => {
      copy.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: "ease-out" }).onfinish = () => copy.remove();
    });
  }, [view, showingFavorites, query.isPending, query.isError, media, viewport.width]);

  const openFavorites = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!animationsEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const destination = showingFavorites ? "pictures" : "favorites";
    const destinationQuery = mediaQueryOptions(pageSize, showingFavorites ? "all" : "favorites", selectedFilter);
    if (!queryClient.getQueryData(destinationQuery.queryKey)) {
      navigate(showingFavorites ? "/gallery" : "/gallery/favorites");
      return;
    }
    const positions = new Map<string, DOMRect>();
    const copies = new Map<string, HTMLElement>();
    favoriteTransition = { destination, positions, copies };
    for (const cell of galleryRef.current?.querySelectorAll<HTMLElement>("[data-gallery-window-id]") ?? []) {
      const id = cell.dataset.galleryWindowId ?? "";
      if (!isVisibleCell(cell)) continue;
      {
        const rect = cell.getBoundingClientRect();
        positions.set(id, rect);
        const copy = cell.cloneNode(true) as HTMLElement;
        copy.setAttribute("aria-hidden", "true");
        copy.inert = true;
        Object.assign(copy.style, { position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`,
          width: `${rect.width}px`, height: `${rect.height}px`, margin: "0", pointerEvents: "none", zIndex: "10" });
        document.body.appendChild(copy);
        copies.set(id, copy);
      }
    }
    navigate(showingFavorites ? "/gallery" : "/gallery/favorites");
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length || uploading) return;
    setUploading(true);
    try {
      const batch = await uploadService.submit(files);
      await queryClient.invalidateQueries({ queryKey: ["uploads"] });
      showToast.success(t("Begin uploading {count} media", { count: files.length }), { id: `upload-start:${batch.id}` });
    } catch (error) {
      showToast.error(t("Could not start this upload."), error instanceof Error ? error.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  const refreshFavoriteQueries = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["media"] }),
    queryClient.invalidateQueries({ queryKey: albumKeys.all }),
  ]);

  const cancelSelection = () => {
    setSelectedItems(new Map());
    setSelectionMode(false);
  };

  useEffect(() => {
    setSelectionMode(false);
    setSelectedItems(new Map());
    setSaveDialogOpen(false);
    setDeleteDialogOpen(false);
    setMissingMedia(null);
    setPreviewMediaId(null);
  }, [view, initialFilter]);

  useEffect(() => {
    if (!selectionMode || saveDialogOpen || deleteDialogOpen || missingMedia || bulkFavoriteBusy) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedItems(new Map());
        setSelectionMode(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectionMode, saveDialogOpen, deleteDialogOpen, missingMedia, bulkFavoriteBusy]);

  useEffect(() => {
    if (previewMediaId || !returnToMediaId.current) return;
    if (query.isFetching && !media.some((item) => item.id === returnToMediaId.current)) return;
    const focusId = resolveFocusMediaId(media, returnToMediaId.current, returnToIndex.current);
    if (!focusId && !query.hasNextPage) {
      returnToMediaId.current = null;
      galleryRef.current?.focus({ preventScroll: true });
      return;
    }
    const tile = Array.from(galleryRef.current?.querySelectorAll<HTMLButtonElement>("[data-media-id]") ?? [])
      .find((element) => element.dataset.mediaId === focusId);
    if (!tile) return;
    returnToMediaId.current = null;
    tile.focus({ preventScroll: true });
    tile.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
  }, [previewMediaId, media, viewport, query.isFetching, query.hasNextPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (previewMediaId || !sentinel || !query.hasNextPage || query.isFetching || query.isFetchNextPageError) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void query.fetchNextPage({ cancelRefetch: false });
      }
    }, {
      root: galleryRef.current?.querySelector(".gallery-page__content"),
      rootMargin: `0px 0px ${viewport.height * 2.5}px 0px`,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewport.height, previewMediaId, query.hasNextPage, query.isFetchNextPageError, query.isFetching, query.fetchNextPage]);

  const toggleFavorite = async (mediaId: string, isFavorited: boolean) => {
    if (favoriteBusy) return;
    setFavoriteBusyId(mediaId);
    try {
      if (isFavorited) await mediaService.unfavorite(mediaId);
      else await mediaService.favorite(mediaId);
      await refreshFavoriteQueries();
      showToast.success(t(isFavorited ? "Favorites removed" : "Media added to favorites"), {
        undo: async () => {
          if (isFavorited) await mediaService.favorite(mediaId);
          else await mediaService.unfavorite(mediaId);
          await refreshFavoriteQueries();
        },
      });
    } catch (error) {
      showToast.error(t("Could not update favorites."), error instanceof Error ? error.message : undefined);
    } finally {
      setFavoriteBusyId(null);
    }
  };

  const toggleSelected = (mediaId: string) => {
    if (bulkFavoriteBusy) return;
    setSelectionMode(true);
    setSelectedItems((current) => {
      const next = new Map(current);
      if (next.has(mediaId)) next.delete(mediaId);
      else {
        const item = media.find((item) => item.id === mediaId);
        if (item) next.set(mediaId, item);
      }
      return next;
    });
  };

  const setDragSelection = (mediaId: string, selected: boolean) => {
    if (bulkFavoriteBusy) return;
    const item = media.find((candidate) => candidate.id === mediaId);
    if (!item && selected) return;
    setSelectionMode(true);
    setSelectedItems((current) => {
      const next = new Map(current);
      if (selected && item) next.set(mediaId, item);
      else next.delete(mediaId);
      return next;
    });
  };
  const selectionDragHandlers = useMediaSelectionDrag(
    !bulkFavoriteBusy,
    selectionMode,
    (mediaId) => selectedItems.has(mediaId),
    setDragSelection,
  );

  const favoriteSelected = async () => {
    if (favoriteBusy || selectedMedia.length === 0) return;
    const items = allSelectedFavorited ? selectedMedia : selectedMedia.filter((item) => !item.isFavorited);
    const favorite = !allSelectedFavorited;
    setBulkFavoriteBusy(true);
    try {
      await applyFavorites(items.map((item) => item.id), favorite);
      const changedItems = items;
      setSelectedItems((current) => {
        const next = new Map(current);
        for (const item of changedItems) {
          if (next.has(item.id)) next.set(item.id, { ...item, isFavorited: favorite });
        }
        return next;
      });
      await refreshFavoriteQueries();
      if (changedItems.length > 0) {
        showToast.success(t(favorite ? "Media added to favorites" : "Favorites removed"), {
          undo: async () => {
            await applyFavorites(changedItems.map((item) => item.id), !favorite);
            setSelectedItems((current) => {
              const next = new Map(current);
              for (const item of changedItems) {
                if (next.has(item.id)) {
                  next.set(item.id, { ...item, isFavorited: !favorite });
                }
              }
              return next;
            });
            await refreshFavoriteQueries();
          },
        });
      }
    } catch (error) {
      showToast.error(t("Could not update favorites."), error instanceof Error ? error.message : undefined);
    } finally {
      setBulkFavoriteBusy(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (isAdmin) {
      const missing: MediaFile[] = [];
      for (let offset = 0; offset < selectedMedia.length; offset += 5) {
        const batch = selectedMedia.slice(offset, offset + 5);
        const available = await Promise.all(batch.map((item) => mediaService.isFileAvailable(item.id)));
        batch.forEach((item, index) => {
          if (!available[index]) missing.push(item);
        });
      }
      if (missing.length > 0) return () => setMissingMedia(missing);
    }
    const deletedIds: string[] = [];
    const failedIds: string[] = [];
    let firstFailure: unknown;
    for (let offset = 0; offset < selectedIds.length; offset += 5) {
      const batch = selectedIds.slice(offset, offset + 5);
      const results = await Promise.allSettled(batch.map((mediaId) => mediaService.remove(mediaId)));
      results.forEach((result, index) => {
        if (result.status === "fulfilled") deletedIds.push(batch[index]);
        else {
          if (failedIds.length === 0) firstFailure = result.reason;
          failedIds.push(batch[index]);
        }
      });
    }

    if (deletedIds.length > 0) {
      setSelectedItems((current) => {
        const next = new Map(current);
        deletedIds.forEach((mediaId) => next.delete(mediaId));
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      showToast.delete(t("Media moved to trash"), {
        undo: async () => {
          for (const mediaId of deletedIds) await mediaService.restore(mediaId);
          await queryClient.invalidateQueries({ queryKey: ["media"] });
        },
      });
    }

    if (failedIds.length > 0) throw firstFailure;

    cancelSelection();
  };

  const checkUnavailable = async (mediaId: string) => {
    if (await mediaService.isFileAvailable(mediaId)) return false;
    const item = media.find((candidate) => candidate.id === mediaId);
    if (item) setMissingMedia([item]);
    return true;
  };

  const deleteMissingMedia = async () => {
    if (!missingMedia) return;
    const deletedIds = new Set<string>();
    try {
      for (const item of missingMedia) {
        await mediaService.deleteRecord(item.id);
        deletedIds.add(item.id);
        // Keep only unfinished records so retries cannot repeat successful writes.
        setMissingMedia((current) => current?.filter((candidate) => candidate.id !== item.id) ?? null);
      }
    } finally {
      if (deletedIds.size > 0) {
        setSelectedItems((current) => new Map([...current].filter(([id]) => !deletedIds.has(id))));
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["media"] }),
          queryClient.invalidateQueries({ queryKey: albumKeys.all }),
          queryClient.invalidateQueries({ queryKey: placeKeys.all }),
        ]);
        showToast.delete(t("Media records permanently deleted"));
      }
    }
  };

  return { t, isAdmin, selectedFilter, uploading, uploadInput, selectionMode, selectedItems, selectedIds, membership, inAlbum, saveDialogOpen, setSaveDialogOpen, deleteDialogOpen, setDeleteDialogOpen, missingMedia, setMissingMedia, bulkFavoriteBusy, previewMediaId, setPreviewMediaId, setPreviewGroupKey, hasMoreBelow, galleryRef, returnToMediaId, returnToIndex, sentinelRef, showingFavorites, query, viewport, media, focusMediaId, groups, previewItems, dateFormatter, selectedMedia, allSelectedFavorited, favoriteBusy, openFavorites, uploadFiles, cancelSelection, toggleFavorite, toggleSelected, selectionDragHandlers, favoriteSelected, deleteSelected, checkUnavailable, deleteMissingMedia };
}
