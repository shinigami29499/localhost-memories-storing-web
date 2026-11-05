import { PageActionBar } from "../../components/layout/PageActionBar";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Heart } from "@/components/animate-ui/icons/heart";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { BulkSaveToAlbumDialog } from "../../features/albums/components/BulkSaveToAlbumDialog";
import { albumKeys } from "../../features/albums/hooks/useAlbums";
import { useAlbumMembership } from "../../features/albums/hooks/useAlbums";
import { ConfirmationDialog, EmptyState, ErrorState, Spinner } from "../../components/ui";
import { showToast } from "../../components/ui/Toast";
import { useLocale } from "../../context/LocaleContext";
import { MediaRetryProvider } from "../../features/media/components/MediaRetryProvider";
import { MediaPreviewDialog } from "../../features/media/components/MediaPreviewDialog";
import { useMediaSelectionDrag } from "../../features/media/hooks/useMediaSelectionDrag";
import { mediaService } from "../../features/media/services/mediaService";
import { mediaQueryOptions } from "../../features/media/hooks/useMedia";
import { SelectionActions } from "./SelectionActions";
import { uploadService } from "../../features/uploads/services/uploadService";
import type { MediaFile, MediaKindFilter } from "../../features/media/types";
import { useGalleryWindow } from "../../features/media/hooks/useGalleryWindow";
import { VirtualGalleryGroup } from "./VirtualGalleryGroup";
import { resolveFocusMediaId } from "./resolveFocusMediaId";
import "./gallery.css";
import "../../features/media/components/media.css";

export type GalleryView = "pictures" | "favorites";

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
    emptyHint: "Double-click an image or video to add it to favorites.",
  },
};



/** Applies favorite state in small batches and returns the media ids that failed. */
async function applyFavorites(mediaIds: string[], favorite: boolean) {
  if (mediaIds.length > 0) await mediaService.setFavorites(mediaIds, favorite);
}

export function GalleryPage({ view = "pictures", initialFilter }: { view?: GalleryView; initialFilter?: MediaKindFilter }) {
  const { t, language } = useLocale();
  const queryClient = useQueryClient();
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
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);
  const [bulkFavoriteBusy, setBulkFavoriteBusy] = useState(false);
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
  const galleryRef = useRef<HTMLElement>(null);
  const returnToMediaId = useRef<string | null>(null);
  const returnToIndex = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const showingFavorites = view === "favorites";
  const query = useInfiniteQuery({ ...mediaQueryOptions(20, showingFavorites ? "favorites" : "all", selectedFilter), staleTime: 0 });
  const viewport = useGalleryWindow(galleryRef, `${view}:${selectedFilter}`);

  const media = useMemo(
    () => (Array.isArray(query.data?.pages) ? query.data.pages : [])
      .filter((page) => page && Array.isArray(page.items)).flatMap((page) => page.items),
    [query.data],
  );
  const focusMediaId = resolveFocusMediaId(media, returnToMediaId.current, returnToIndex.current);
  const total = query.data?.pages[0]?.total ?? 0;
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
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(language, { year: "numeric", month: "long", day: "numeric" }),
    [language],
  );
  const copy = viewCopy[view];
  const selectedMedia = [...selectedItems.values()];
  const allSelectedFavorited = selectedMedia.length > 0 && selectedMedia.every((item) => item.isFavorited);
  const favoriteBusy = favoriteBusyId !== null || bulkFavoriteBusy;

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
    setPreviewMediaId(null);
  }, [view, initialFilter]);

  useEffect(() => {
    if (!selectionMode || saveDialogOpen || deleteDialogOpen || bulkFavoriteBusy) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedItems(new Map());
        setSelectionMode(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectionMode, saveDialogOpen, deleteDialogOpen, bulkFavoriteBusy]);

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
        void query.fetchNextPage();
      }
    }, { rootMargin: "0px 0px 2000px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [previewMediaId, query.hasNextPage, query.isFetchNextPageError, query.isFetching, query.fetchNextPage]);

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

  const galleryContent = (
    <>
      {query.isPending ? <Spinner label={t("Loading media…")} /> : null}
      {query.isError && media.length === 0 ? (
        <ErrorState message={t("Could not load media.")} onRetry={() => void query.refetch()} />
      ) : null}
      {!query.isPending && !query.isError && media.length === 0 ? (
        <EmptyState
          title={view === "favorites"
            ? selectedFilter === "video"
              ? "No favorite videos yet"
              : selectedFilter === "image"
                ? "No favorite images yet"
                : "No favorites yet"
            : selectedFilter === "video"
              ? "No videos yet"
              : selectedFilter === "image"
                ? "No images yet."
                : "No media yet"}
          hint={view === "favorites"
            ? "Tap the heart on an image or video to add it here."
            : selectedFilter === "video"
              ? "Videos added to your library will appear here."
              : selectedFilter === "image"
                ? "Images added to your library will appear here."
                : "Uploaded images and videos will appear here."}
        />
      ) : null}
      {media.length > 0 ? (
        <div className="gallery-groups" aria-busy={query.isFetching}>
          <MediaRetryProvider key={`${view}-${selectedFilter}`} order={groups.flatMap(([, group]) => group.items.map((item) => item.id))}>
            {groups.map(([key, group]) => {
              const dateLabel = dateFormatter.format(group.date);
              return (
              <section key={key} aria-label={dateLabel}>
                <div className="gallery-group__header">
                  <h2 className="gallery-group__title">
                    <time dateTime={`${group.date.getFullYear()}-${String(group.date.getMonth() + 1).padStart(2, "0")}-${String(group.date.getDate()).padStart(2, "0")}`}>
                      {dateLabel}
                    </time>
                  </h2>
                </div>
                  <VirtualGalleryGroup items={group.items} viewport={viewport} mediaKind={selectedFilter} pinnedId={focusMediaId}
                    selectionMode={selectionMode} selectedItems={selectedItems} onSelect={toggleSelected}
                    onFavorite={(mediaId) => void toggleFavorite(mediaId, false)} favoriteBusy={favoriteBusy} onOpen={setPreviewMediaId} />
              </section>
              );
            })}
          </MediaRetryProvider>
        </div>
      ) : null}

      {query.isFetchNextPageError && media.length > 0 && !previewMediaId ? (
        <ErrorState message={t("Could not load more media.")} onRetry={() => void query.fetchNextPage()} />
      ) : null}
      {query.isFetchingNextPage ? <Spinner label={t("Loading more media…")} /> : null}
      <div ref={sentinelRef} aria-hidden="true" />
      {query.isError && !query.isFetchNextPageError && media.length > 0 ? (
        <ErrorState message={t("Could not refresh media.")} onRetry={() => void query.refetch()} />
      ) : null}
      {membership.isError ? (
        <ErrorState
          message={t("Could not load albums.")}
          onRetry={() => void membership.refetch()}
        />
      ) : null}
    </>
  );

  return (
    <main ref={galleryRef} tabIndex={-1} className="gallery-page" {...selectionDragHandlers}
      onClickCapture={(event) => {
        selectionDragHandlers.onClickCapture(event);
        if (event.defaultPrevented) return;
        if (saveDialogOpen || deleteDialogOpen) return;
        if (!selectionMode || (event.target instanceof Element && event.target.closest("[data-media-id], .gallery-selection-bar"))) return;
        cancelSelection();
      }}>
      <div className="gallery-page__fixed-layout">
        <div className="gallery-page__fixed-tabs">
          <div className="gallery-page__content gallery-page__media-scroll">
            <div className="gallery-page__tab-panel gallery-page__tab-panel--media">{galleryContent}</div>
          </div>
        </div>
      </div>

          <PageActionBar className="gallery-selection-bar gallery-selection-bar--compact" role="group" aria-label={t("{count} selected", { count: selectedItems.size })} aria-busy={bulkFavoriteBusy}>
            <span className="gallery-selection-bar__status" role="status">{t("{count} selected", { count: selectedItems.size })}</span>
            <input ref={uploadInput} type="file" accept="image/*,video/*" multiple hidden onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
              void uploadFiles(files);
            }} />
              <button key="primary" type="button" className="gallery-selection-bar__action" aria-label={t("Upload media")} title={t("Upload media")}
                disabled={uploading || bulkFavoriteBusy} aria-busy={uploading || undefined} onClick={() => uploadInput.current?.click()}>
                {uploading ? <LoaderCircle size={20} className="spinner__wheel" aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
              </button>
            {selectionMode ? (
              <button
                key="favorite"
                type="button"
                className="gallery-selection-bar__action gallery-selection-bar__action--favorite"
                aria-label={t(allSelectedFavorited ? "Remove from favorites" : "Add to favorites")}
                title={t(allSelectedFavorited ? "Remove from favorites" : "Add to favorites")}
                aria-pressed={allSelectedFavorited}
                aria-busy={bulkFavoriteBusy || undefined}
                disabled={favoriteBusy || selectedMedia.length === 0}
                onClick={() => void favoriteSelected()}
              >
                {bulkFavoriteBusy
                  ? <LoaderCircle size={20} className="spinner__wheel" aria-hidden="true" />
                  : <Heart size={20} fill={allSelectedFavorited ? "currentColor" : "none"} aria-hidden="true" />}
              </button>
            ) : (
              <Link key="favorite" className="gallery-selection-bar__action" to={showingFavorites ? "/gallery" : "/gallery/favorites"} aria-label={t(showingFavorites ? "Gallery" : "Favorites")} title={t(showingFavorites ? "Gallery" : "Favorites")}><Heart size={20} fill={showingFavorites ? "currentColor" : "none"} aria-hidden="true" /></Link>
            )}
            <SelectionActions open={selectionMode}>
                <button
                  type="button"
                  className="gallery-selection-bar__action gallery-selection-bar__action--save"
                  aria-label={t("Save to album")}
                  title={t("Save to album")}
                  aria-pressed={inAlbum}
                  aria-busy={membership.isPending || undefined}
                  disabled={favoriteBusy || selectedMedia.length === 0}
                  onClick={() => setSaveDialogOpen(true)}
                >
                  <Bookmark size={20} fill={inAlbum ? "currentColor" : "none"} aria-hidden="true" />
                </button>
              <button
                type="button"
                className="gallery-selection-bar__action gallery-selection-bar__action--danger"
                aria-label={t("Move to trash")}
                title={t("Move to trash")}
                disabled={favoriteBusy || selectedMedia.length === 0}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 size={20} aria-hidden="true" />
              </button>
            </SelectionActions>
          </PageActionBar>

      {saveDialogOpen ? (
        <BulkSaveToAlbumDialog
          mediaIds={selectedIds}
          onClose={() => setSaveDialogOpen(false)}
        />
      ) : null}
      {deleteDialogOpen ? (
        <ConfirmationDialog
          title="Move selected media to trash?"
          danger
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={deleteSelected}
        >
          {t("Selected media will move to trash and can be restored later.")}
        </ConfirmationDialog>
      ) : null}
      {previewMediaId ? (
        <MediaPreviewDialog
          key={previewMediaId}
          media={media}
          initialMediaId={previewMediaId}
          total={total}
          loadingMore={query.isFetching}
          loadMoreError={query.isFetchNextPageError}
          onLoadMore={query.hasNextPage ? () => { void query.fetchNextPage({ cancelRefetch: false }); } : undefined}
          favoriteBusy={favoriteBusy}
          onToggleFavorite={(mediaId, isFavorited) => void toggleFavorite(mediaId, isFavorited)}
          onClose={(mediaId) => {
            returnToIndex.current = Math.max(0, media.findIndex((item) => item.id === mediaId));
            returnToMediaId.current = mediaId;
            setPreviewMediaId(null);
          }}
        />
      ) : null}
    </main>
  );
}
