import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { BulkSaveToAlbumDialog } from "../../features/albums/components/BulkSaveToAlbumDialog";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { showToast } from "../../components/ui/Toast";
import { useLocale } from "../../context/LocaleContext";
import { MediaCard } from "../../features/media/components/MediaCard";
import { mediaService } from "../../features/media/services/mediaService";
import { useMedia } from "../../features/media/hooks/useMedia";
import type { MediaKindFilter } from "../../features/media/types";
import { useAuthStore } from "../../store/authStore";
import "./gallery.css";
import "../../features/media/components/media.css";

export type GalleryView = "pictures" | "videos" | "favorites";

const viewCopy: Record<GalleryView, { title: string; description: string; emptyTitle: string; emptyHint: string }> = {
  pictures: {
    title: "Pictures",
    description: "Browse images in your library.",
    emptyTitle: "No pictures yet",
    emptyHint: "Uploaded images will appear here.",
  },
  videos: {
    title: "Videos",
    description: "Browse videos in your library.",
    emptyTitle: "No videos yet",
    emptyHint: "Uploaded videos will appear here.",
  },
  favorites: {
    title: "Favorites",
    description: "Images and videos you have favorited.",
    emptyTitle: "No favorites yet",
    emptyHint: "Add media to favorites with the heart button.",
  },
};

const filters: { value: MediaKindFilter | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
];

export function GalleryPage({ view = "pictures" }: { view?: GalleryView }) {
  const { t } = useLocale();
  const isAdmin = useAuthStore((state) => state.user?.role.toLowerCase() === "admin");
  const [selectedFilter, setSelectedFilter] = useState<MediaKindFilter | "all">("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const filter = view === "videos" ? "video" : view === "pictures" ? "image" : selectedFilter;
  const query = useMedia(20, view === "favorites" ? "favorites" : "all", filter === "all" ? undefined : filter);
  const media = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.items),
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? 0;
  const copy = viewCopy[view];

  useEffect(() => {
    setSelectedFilter("all");
    setSelectionMode(false);
    setSelectedIds(new Set());
    setSaveDialogOpen(false);
    setDeleteIds(null);
  }, [view]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !query.hasNextPage || query.isFetching || query.isFetchNextPageError) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void query.fetchNextPage();
      }
    }, { rootMargin: "0px 0px 400px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [query.fetchNextPage, query.hasNextPage, query.isFetchNextPageError, query.isFetching]);

  const toggleFavorite = async (mediaId: string, isFavorited: boolean) => {
    if (favoriteBusyId) return;
    setFavoriteBusyId(mediaId);
    try {
      if (isFavorited) await mediaService.unfavorite(mediaId);
      else await mediaService.favorite(mediaId);
      await query.refetch();
    } catch (error) {
      showToast.error(t("Could not update favorites."), error instanceof Error ? error.message : undefined);
    } finally {
      setFavoriteBusyId(null);
    }
  };

  const toggleSelected = (mediaId: string) => {
    setSelectionMode(true);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(mediaId)) next.delete(mediaId);
      else next.add(mediaId);
      return next;
    });
  };

  const removeSelected = async () => {
    if (!deleteIds?.length) return;
    const results = await Promise.allSettled(deleteIds.map((mediaId) => mediaService.remove(mediaId)));
    const failed = results.filter((result) => result.status === "rejected").length;
    setSelectedIds(new Set());
    setSelectionMode(false);
    setDeleteIds(null);
    await query.refetch();
    if (failed > 0) showToast.error(t("{count} media items could not be moved to trash.", { count: failed }));
    else showToast.success(t("Media moved to trash"));
  };

  return (
    <main className="gallery-page">
      <div className="gallery-page__content">
        <div className="gallery-page__inner">
          <header className="gallery-page__header">
            <p className="gallery-page__eyebrow">{t("Your library")}</p>
            <h1>{t(copy.title)}<span className="brand__dot">.</span></h1>
            <p>{t(copy.description)}</p>
          </header>

          <div className="gallery-page__toolbar">
            {view === "favorites" ? (
              <div className="gallery-page__filters" role="group" aria-label={t("Filter media")}>
                {filters.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className="gallery-page__filter"
                    aria-pressed={selectedFilter === value}
                    onClick={() => setSelectedFilter(value)}
                  >
                    {t(label)}
                  </button>
                ))}
              </div>
            ) : null}
            {view !== "favorites" ? (
              <button
                type="button"
                className="btn btn--secondary"
                aria-pressed={selectionMode}
                onClick={() => {
                  setSelectionMode((active) => !active);
                  setSelectedIds(new Set());
                }}
              >
                {t(selectionMode ? "Cancel selection" : "Select media")}
              </button>
            ) : null}
            {selectionMode && selectedIds.size > 0 ? (
              <div className="gallery-page__selection-actions">
                <span>{t("{count} selected", { count: selectedIds.size })}</span>
                <button type="button" className="btn btn--secondary" onClick={() => setSaveDialogOpen(true)}>
                  <Bookmark size={16} aria-hidden="true" />
                  {t("Save to album")}
                </button>
                {isAdmin ? (
                  <button type="button" className="btn btn--danger" onClick={() => setDeleteIds([...selectedIds])}>
                    <Trash2 size={16} aria-hidden="true" />
                    {t("Move to trash")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {query.isPending ? <Spinner label={t("Loading media…")} /> : null}
          {query.isError && media.length === 0 ? (
            <ErrorState message={t("Could not load media.")} onRetry={() => void query.refetch()} />
          ) : null}
          {!query.isPending && !query.isError && media.length === 0 ? (
            <EmptyState title={t(copy.emptyTitle)} hint={t(copy.emptyHint)} />
          ) : null}
          {media.length > 0 ? (
            <div className="media-grid" aria-busy={query.isFetching}>
              {media.map((item) => (
                <div key={item.id} className="gallery-media">
                  {selectionMode ? (
                    <label className="gallery-media__select">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelected(item.id)}
                        aria-label={t("Select {filename}", { filename: item.originalFilename })}
                      />
                    </label>
                  ) : null}
                  <MediaCard
                    media={item}
                    onToggleFavorite={toggleFavorite}
                    favoriteBusy={favoriteBusyId === item.id}
                    favoriteDisabled={favoriteBusyId !== null}
                  />
                </div>
              ))}
            </div>
          ) : null}

          {query.isFetchNextPageError ? (
            <ErrorState message={t("Could not load more media.")} onRetry={() => void query.fetchNextPage()} />
          ) : null}
          {query.isFetchingNextPage ? <Spinner label={t("Loading more media…")} /> : null}
          <div ref={sentinelRef} aria-hidden="true" />
          {!query.hasNextPage && total > 0 ? (
            <p className="gallery-page__end" role="status">{t("All media loaded")}</p>
          ) : null}
          {query.isError && media.length > 0 ? (
            <ErrorState message={t("Could not refresh media.")} onRetry={() => void query.refetch()} />
          ) : null}
        </div>
      </div>

      {saveDialogOpen ? (
        <BulkSaveToAlbumDialog
          mediaIds={[...selectedIds]}
          onSaved={() => {
            setSelectedIds(new Set());
            setSelectionMode(false);
          }}
          onClose={() => setSaveDialogOpen(false)}
        />
      ) : null}
      {deleteIds ? (
        <ConfirmationDialog
          title="Move media to trash?"
          danger
          onClose={() => setDeleteIds(null)}
          onConfirm={removeSelected}
        >
          {t("Selected media will move to trash.")}
        </ConfirmationDialog>
      ) : null}
    </main>
  );
}
