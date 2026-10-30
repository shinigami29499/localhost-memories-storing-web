import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import * as Tabs from "@radix-ui/react-tabs";
import { ScrollProgress, ScrollProgressContainer, ScrollProgressProvider } from "@animate-ui/react/primitives/scroll-progress";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Clock } from "@/components/animate-ui/icons/clock";
import { Heart } from "@/components/animate-ui/icons/heart";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { BulkSaveToAlbumDialog } from "../../features/albums/components/BulkSaveToAlbumDialog";
import { albumKeys } from "../../features/albums/hooks/useAlbums";
import { albumService } from "../../features/albums/services/albumService";
import { ConfirmationDialog, EmptyState, ErrorState, Spinner } from "../../components/ui";
import { PageTransition } from "../../components/layout/PageTransition";
import { showToast } from "../../components/ui/Toast";
import { useLocale } from "../../context/LocaleContext";
import { readPageTransitionEffect } from "../../utils/pageTransition";
import { MediaTile } from "../../features/media/components/MediaTile";
import { MediaRetryProvider } from "../../features/media/components/MediaRetryProvider";
import { MediaPreviewDialog } from "../../features/media/components/MediaPreviewDialog";
import { useMediaSelectionDrag } from "../../features/media/hooks/useMediaSelectionDrag";
import { mediaService } from "../../features/media/services/mediaService";
import { useMedia } from "../../features/media/hooks/useMedia";
import type { MediaFile, MediaKindFilter } from "../../features/media/types";
import "./gallery.css";
import "../../features/media/components/media.css";

export type GalleryView = "pictures" | "favorites";

type FavoritesFilter = MediaKindFilter | "all";

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

const filters: { value: FavoritesFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

function groupMediaByMinute(items: MediaFile[]) {
  const grouped = new Map<string, { time: Date; items: MediaFile[] }>();
  for (const item of items) {
    const time = new Date(item.createdAt);
    time.setSeconds(0, 0);
    const key = String(time.getTime());
    const group = grouped.get(key);
    if (group) group.items.push(item);
    else grouped.set(key, { time, items: [item] });
  }
  return [...grouped.entries()].sort(([, a], [, b]) => a.time.getTime() - b.time.getTime());
}

/** Applies favorite state in small batches and returns the media ids that failed. */
async function applyFavorites(mediaIds: string[], favorite: boolean) {
  const failedIds: string[] = [];
  for (let offset = 0; offset < mediaIds.length; offset += 5) {
    const batch = mediaIds.slice(offset, offset + 5);
    const results = await Promise.allSettled(batch.map((mediaId) =>
      favorite ? mediaService.favorite(mediaId) : mediaService.unfavorite(mediaId),
    ));
    results.forEach((result, index) => {
      if (result.status === "rejected") failedIds.push(batch[index]);
    });
  }
  return failedIds;
}

export function GalleryPage({ view = "pictures", initialFilter }: { view?: GalleryView; initialFilter?: FavoritesFilter }) {
  const { t, language } = useLocale();
  const pageTransition = readPageTransitionEffect();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<FavoritesFilter>(() => initialFilter ?? "all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, MediaFile>>(() => new Map());
  const selectedIds = [...selectedItems.keys()];
  const albumQueries = useQueries({
    queries: selectedIds.map((mediaId) => ({
      queryKey: albumKeys.list("mine", mediaId),
      queryFn: () => albumService.list("mine", mediaId),
    })),
  });
  const inAlbum = albumQueries.some((query) => query.data?.some((album) => album.containsMedia));
  const failedAlbumQueries = albumQueries.filter((query) => query.isError);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);
  const [bulkFavoriteBusy, setBulkFavoriteBusy] = useState(false);
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
  const [timelineDay, setTimelineDay] = useState<string | null>(null);
  const timelineRef = useRef<HTMLOListElement>(null);
  const galleryRef = useRef<HTMLElement>(null);
  const returnToMediaId = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const filter: MediaKindFilter | undefined = selectedFilter === "all" ? undefined : selectedFilter;
  const query = useMedia(20, view === "favorites" ? "favorites" : "all", filter);
  const media = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.items),
    [query.data],
  );
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
  const visibleGroups = timelineDay === null ? groups : groups.filter(([key]) => key === timelineDay);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(language, { year: "numeric", month: "long", day: "numeric" }),
    [language],
  );
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(language, { hour: "numeric", minute: "2-digit" }),
    [language],
  );
  const copy = viewCopy[view];
  const selectedMedia = [...selectedItems.values()];
  const allSelectedFavorited = selectedMedia.length > 0 && selectedMedia.every((item) => item.isFavorited);
  const favoriteBusy = favoriteBusyId !== null || bulkFavoriteBusy;

  const cancelSelection = () => {
    setSelectedItems(new Map());
    setSelectionMode(false);
  };

  useEffect(() => {
    setSelectedFilter(initialFilter ?? "all");
    setSelectionMode(false);
    setSelectedItems(new Map());
    setSaveDialogOpen(false);
    setDeleteDialogOpen(false);
    setPreviewMediaId(null);
    setTimelineDay(null);
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
    const tile = Array.from(galleryRef.current?.querySelectorAll<HTMLButtonElement>("[data-media-id]") ?? [])
      .find((element) => element.dataset.mediaId === returnToMediaId.current);
    returnToMediaId.current = null;
    tile?.focus({ preventScroll: true });
    tile?.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
  }, [previewMediaId]);

  useEffect(() => {
    if (timelineDay === null) return;
    timelineRef.current?.scrollIntoView?.({ block: "center", inline: "center", behavior: "auto" });
  }, [timelineDay]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (timelineDay !== null || previewMediaId || !sentinel || !query.hasNextPage || query.isFetching || query.isFetchNextPageError) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void query.fetchNextPage();
      }
    }, { rootMargin: "0px 0px 400px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [previewMediaId, query.fetchNextPage, query.hasNextPage, query.isFetchNextPageError, query.isFetching, timelineDay]);

  const toggleFavorite = async (mediaId: string, isFavorited: boolean) => {
    if (favoriteBusy) return;
    setFavoriteBusyId(mediaId);
    try {
      if (isFavorited) await mediaService.unfavorite(mediaId);
      else await mediaService.favorite(mediaId);
      await query.refetch();
      showToast.success(t(isFavorited ? "Favorites removed" : "Media added to favorites"), {
        undo: async () => {
          if (isFavorited) await mediaService.favorite(mediaId);
          else await mediaService.unfavorite(mediaId);
          await query.refetch();
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

  const selectForDrag = (mediaId: string) => {
    if (bulkFavoriteBusy) return;
    const item = media.find((candidate) => candidate.id === mediaId);
    if (!item) return;
    setSelectionMode(true);
    setSelectedItems((current) => {
      if (current.has(mediaId)) return current;
      const next = new Map(current);
      next.set(mediaId, item);
      return next;
    });
  };
  const selectionDragHandlers = useMediaSelectionDrag(!bulkFavoriteBusy, selectionMode, selectForDrag);

  const favoriteSelected = async () => {
    if (favoriteBusy || selectedMedia.length === 0) return;
    const items = allSelectedFavorited ? selectedMedia : selectedMedia.filter((item) => !item.isFavorited);
    const favorite = !allSelectedFavorited;
    setBulkFavoriteBusy(true);
    try {
      const failedIds = await applyFavorites(items.map((item) => item.id), favorite);
      const changedItems = items.filter((item) => !failedIds.includes(item.id));
      setSelectedItems((current) => {
        const next = new Map(current);
        for (const item of changedItems) {
          if (next.has(item.id)) next.set(item.id, { ...item, isFavorited: favorite });
        }
        return next;
      });
      if (failedIds.length > 0) showToast.error(t("Could not update favorites."));
      else if (changedItems.length > 0) {
        showToast.success(t(favorite ? "Media added to favorites" : "Favorites removed"), {
          undo: async () => {
            const undoFailedIds = await applyFavorites(changedItems.map((item) => item.id), !favorite);
            if (undoFailedIds.length > 0) throw new Error(t("Could not update favorites."));
            setSelectedItems((current) => {
              const next = new Map(current);
              for (const item of changedItems) {
                if (next.has(item.id)) next.set(item.id, { ...item, isFavorited: !favorite });
              }
              return next;
            });
            await query.refetch();
          },
        });
      }
      await query.refetch();
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
      showToast.success(t("Media moved to trash"), {
        undo: async () => {
          for (const mediaId of deletedIds) await mediaService.restore(mediaId);
          await queryClient.invalidateQueries({ queryKey: ["media"] });
        },
      });
    }

    if (failedIds.length > 0) throw firstFailure;

    cancelSelection();
  };

  const toggleTimelineDay = (key: string) => {
    setTimelineDay((current) => current === key ? null : key);
  };

  const galleryContent = (
    <>
      {query.isPending ? <Spinner label={t("Loading media…")} /> : null}
      {query.isError && media.length === 0 ? (
        <ErrorState message={t("Could not load media.")} onRetry={() => void query.refetch()} />
      ) : null}
      {!query.isPending && !query.isError && media.length === 0 ? (
        <EmptyState title={t(copy.emptyTitle)} hint={t(copy.emptyHint)} />
      ) : null}
      {media.length > 0 ? (
        <div className="gallery-groups" aria-busy={query.isFetching}>
          <MediaRetryProvider key={`${view}-${selectedFilter}`} order={groups.flatMap(([, group]) => group.items.map((item) => item.id))}>
            {visibleGroups.map(([key, group]) => {
              const dateLabel = dateFormatter.format(group.date);
              const timelineOpen = timelineDay === key;
              const toggleLabel = t(timelineOpen ? "Hide timeline for {date}" : "Show timeline for {date}", { date: dateLabel });
              return (
              <section key={key} aria-label={dateLabel}>
                <div className="gallery-group__header">
                  <h2 className="gallery-group__title">
                    <time dateTime={`${group.date.getFullYear()}-${String(group.date.getMonth() + 1).padStart(2, "0")}-${String(group.date.getDate()).padStart(2, "0")}`}>
                      {dateLabel}
                    </time>
                  </h2>
                  <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                    <button
                      type="button"
                      className="gallery-group__timeline-toggle"
                      aria-pressed={timelineOpen}
                      aria-controls={timelineOpen ? `gallery-timeline-${key}` : undefined}
                      aria-label={toggleLabel}
                      title={toggleLabel}
                      onClick={() => toggleTimelineDay(key)}
                    >
                      <Clock size={18} aria-hidden="true" />
                    </button>
                  </AnimateIcon>
                </div>
                {timelineOpen ? (
                  <ol ref={timelineRef} id={`gallery-timeline-${key}`} className="gallery-timeline" tabIndex={0} aria-label={t("Media timeline for {date}", { date: dateLabel })}>
                    {groupMediaByMinute(group.items).map(([minute, minuteGroup], index) => (
                      <li
                        key={minute}
                        className={`gallery-timeline__event${index % 2 === 0 ? " gallery-timeline__event--above" : " gallery-timeline__event--below"}`}
                      >
                        <span className="gallery-timeline__stem" aria-hidden="true" />
                        <span className="gallery-timeline__node" aria-hidden="true" />
                        <time className="gallery-timeline__time" dateTime={minuteGroup.time.toISOString()}>
                          {timeFormatter.format(minuteGroup.time)}
                        </time>
                        <div className="gallery-timeline__media">
                          {minuteGroup.items.map((item) => (
                            <MediaTile
                              key={item.id}
                              media={item}
                              selectionMode={selectionMode}
                              selectionDragEnabled
                              selected={selectedItems.has(item.id)}
                              onSelect={toggleSelected}
                              onFavorite={(mediaId) => void toggleFavorite(mediaId, false)}
                              favoriteDisabled={favoriteBusy}
                              onOpen={setPreviewMediaId}
                            />
                          ))}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div
                    className="gallery-date-grid"
                  >
                    {group.items.map((item) => (
                      <MediaTile
                        key={item.id}
                        media={item}
                        selectionMode={selectionMode}
                        selectionDragEnabled
                        selected={selectedItems.has(item.id)}
                        onSelect={toggleSelected}
                        onFavorite={(mediaId) => void toggleFavorite(mediaId, false)}
                        favoriteDisabled={favoriteBusy}
                        onOpen={setPreviewMediaId}
                      />
                    ))}
                  </div>
                )}
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
      {timelineDay === null ? <div ref={sentinelRef} aria-hidden="true" /> : null}
      {query.isError && !query.isFetchNextPageError && media.length > 0 ? (
        <ErrorState message={t("Could not refresh media.")} onRetry={() => void query.refetch()} />
      ) : null}
      {failedAlbumQueries.length > 0 ? (
        <ErrorState
          message={t("Could not load albums.")}
          onRetry={() => { for (const query of failedAlbumQueries) void query.refetch(); }}
        />
      ) : null}
    </>
  );

  return (
    <main ref={galleryRef} className="gallery-page" {...selectionDragHandlers}>
      <ScrollProgressProvider>
        <div className="gallery-page__scroll-track" aria-hidden="true">
          <ScrollProgress mode="scaleX" className="gallery-page__scroll-progress" />
        </div>
        <ScrollProgressContainer className="gallery-page__content">
          <div className="gallery-page__inner">
            <header className="gallery-page__header">
              <p className="gallery-page__eyebrow">{t("Your library")}</p>
              <h1>{t(copy.title)}<span className="brand__dot">.</span></h1>
              <p>{t(copy.description)}</p>
            </header>

            <Tabs.Root
              value={selectedFilter}
              onValueChange={(value) => {
                if (value !== "all" && value !== "image" && value !== "video") return;
                setSelectedFilter(value);
                setPreviewMediaId(null);
                setTimelineDay(null);
                setSelectionMode(false);
                setSelectedItems(new Map());
              }}
            >
              <div className="gallery-page__toolbar">
                <Tabs.List className="gallery-page__filters" aria-label={t("Filter by media type")}>
                  {filters.map(({ value, label }) => (
                    <Tabs.Trigger
                      key={value}
                      className="gallery-page__filter"
                      value={value}
                      disabled={bulkFavoriteBusy}
                    >
                      {t(label)}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
              </div>
              <Tabs.Content value={selectedFilter} className="gallery-page__tab-panel">
                <PageTransition effect={pageTransition} transitionKey={selectedFilter}>
                  {galleryContent}
                </PageTransition>
              </Tabs.Content>
            </Tabs.Root>
          </div>
        </ScrollProgressContainer>
      </ScrollProgressProvider>

      {selectionMode ? (
        <footer className="gallery-page__footer">
          <div className="gallery-selection-bar gallery-selection-bar--compact" role="group" aria-label={t("{count} selected", { count: selectedItems.size })} aria-busy={bulkFavoriteBusy}>
            <span className="gallery-selection-bar__status" role="status">{t("{count} selected", { count: selectedItems.size })}</span>
            <button
              type="button"
              className="gallery-selection-bar__action gallery-selection-bar__action--favorite"
              aria-label={t(allSelectedFavorited ? "Remove from favorites" : "Add to favorites")}
              title={t(allSelectedFavorited ? "Remove from favorites" : "Add to favorites")}
              aria-pressed={allSelectedFavorited}
              disabled={favoriteBusy || selectedMedia.length === 0}
              onClick={() => void favoriteSelected()}
            >
              {bulkFavoriteBusy
                ? <LoaderCircle size={20} className="spinner__wheel" aria-hidden="true" />
                : <Heart size={20} fill={allSelectedFavorited ? "currentColor" : "none"} aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="gallery-selection-bar__action gallery-selection-bar__action--save"
              aria-label={t("Save to album")}
              title={t("Save to album")}
              aria-pressed={inAlbum}
              aria-busy={albumQueries.some((query) => query.isPending) || undefined}
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
            <button
              type="button"
              className="gallery-selection-bar__cancel"
              aria-label={t("Cancel selection")}
              title={t("Cancel selection")}
              disabled={bulkFavoriteBusy}
              onClick={cancelSelection}
            >
              <X size={20} aria-hidden="true" />
              <span className="gallery-selection-bar__cancel-text">{t("Cancel")}</span>
            </button>
          </div>
        </footer>
      ) : null}

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
            returnToMediaId.current = mediaId;
            setPreviewMediaId(null);
          }}
        />
      ) : null}
    </main>
  );
}
