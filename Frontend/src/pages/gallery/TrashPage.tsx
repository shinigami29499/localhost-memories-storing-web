import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { showToast } from "../../components/ui/Toast";
import { useLocale } from "../../context/LocaleContext";
import { MediaTile } from "../../features/media/components/MediaTile";
import { MediaRetryProvider } from "../../features/media/components/MediaRetryProvider";
import { MediaPreviewDialog } from "../../features/media/components/MediaPreviewDialog";
import { useMediaSelectionDrag } from "../../features/media/hooks/useMediaSelectionDrag";
import { mediaService } from "../../features/media/services/mediaService";
import type { MediaKindFilter } from "../../features/media/types";
import "./gallery.css";
import "../../features/media/components/media.css";

const TRASH_PAGE_SIZE = 20;

const filters: { value: MediaKindFilter; label: string }[] = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
];

export function TrashPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<MediaKindFilter>("image");
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [action, setAction] = useState<{ kind: "restore" | "delete"; ids: string[] } | null>(null);
  const galleryRef = useRef<HTMLElement>(null);
  const returnToMediaId = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const query = useInfiniteQuery({
    queryKey: ["media", "deleted", filter, TRASH_PAGE_SIZE],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => mediaService.deleted(pageParam, TRASH_PAGE_SIZE, filter),
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
  });
  const media = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.items),
    [query.data],
  );

  const cancelSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
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

  const selectForDrag = (mediaId: string) => {
    setSelectionMode(true);
    setSelectedIds((current) => {
      if (current.has(mediaId)) return current;
      const next = new Set(current);
      next.add(mediaId);
      return next;
    });
  };
  const selectionDragHandlers = useMediaSelectionDrag(!action, selectionMode, selectForDrag);

  const requestAction = (kind: "restore" | "delete", ids: string[]) => {
    if (ids.length === 0) return;
    // Close the native modal before opening the portaled confirmation dialog.
    returnToMediaId.current = ids[0];
    setPreviewMediaId(null);
    setAction({ kind, ids });
  };

  const confirmAction = async () => {
    if (!action) return;
    try {
      for (const id of action.ids) {
        if (action.kind === "restore") await mediaService.restore(id);
        else await mediaService.permanentlyDelete(id);
        // A retry must not repeat successful requests after a partial failure.
        setAction((current) => current ? { ...current, ids: current.ids.filter((item) => item !== id) } : null);
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
      showToast.success(t(action.kind === "restore" ? "Media restored successfully" : "Media permanently deleted"));
      cancelSelection();
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["media"] });
    }
  };

  useEffect(() => {
    if (!selectionMode || action) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedIds(new Set());
        setSelectionMode(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectionMode, action]);

  useEffect(() => {
    if (previewMediaId || action || !returnToMediaId.current) return;
    const tiles = Array.from(galleryRef.current?.querySelectorAll<HTMLButtonElement>("[data-media-id]") ?? []);
    const tile = tiles.find((element) => element.dataset.mediaId === returnToMediaId.current) ?? tiles[0];
    returnToMediaId.current = null;
    tile?.focus({ preventScroll: true });
    tile?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [previewMediaId, action]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (previewMediaId || action || !sentinel || !query.hasNextPage || query.isFetching || query.isFetchNextPageError) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void query.fetchNextPage();
      }
    }, { rootMargin: "0px 0px 400px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [previewMediaId, action, query.fetchNextPage, query.hasNextPage, query.isFetchNextPageError, query.isFetching]);

  return (
    <>
      <main ref={galleryRef} className="gallery-page gallery-page--trash" {...selectionDragHandlers}>
        <div className="gallery-page__content">
          <div className="gallery-page__inner">
            <header className="gallery-page__header">
              <p className="gallery-page__eyebrow">{t("Your library")}</p>
              <h1>{t("Trash")}<span className="brand__dot">.</span></h1>
              <p>{t("Restore deleted media to your library.")}</p>
            </header>
            <div className="gallery-page__toolbar">
              <div className="gallery-page__filters" role="group" aria-label={t("Filter media")}>
                {filters.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className="gallery-page__filter"
                    aria-pressed={filter === value}
                    onClick={() => {
                      cancelSelection();
                      setFilter(value);
                    }}
                  >
                    {t(label)}
                  </button>
                ))}
              </div>
            </div>
            {query.isLoading ? <Spinner label={t("Loading media…")} /> : null}
            {query.isError && media.length === 0 ? (
              <ErrorState message={t("Could not load media.")} onRetry={() => void query.refetch()} />
            ) : null}
            {!query.isLoading && !query.isError && media.length === 0 ? (
              <EmptyState title="Trash is empty" hint="Deleted media will appear here." />
            ) : null}
            {media.length > 0 ? (
              <MediaRetryProvider key={filter} order={media.map((item) => item.id)}>
                <div
                  className={`gallery-date-grid gallery-date-grid--${media.length <= 5 ? 5 : media.length <= 10 ? 10 : 15}`}
                  data-mobile-columns={media.length <= 4 ? 4 : 6}
                >
                  {media.map((item) => (
                    <MediaTile
                      key={item.id}
                      media={item}
                      includeDeleted
                      selectionMode={selectionMode}
                      selectionDragEnabled
                      selected={selectedIds.has(item.id)}
                      onSelect={toggleSelected}
                      onOpen={setPreviewMediaId}
                    />
                  ))}
                </div>
              </MediaRetryProvider>
            ) : null}
            {query.isFetchNextPageError && media.length > 0 && !previewMediaId ? (
              <ErrorState message={t("Could not load more media.")} onRetry={() => void query.fetchNextPage()} />
            ) : null}
            {query.isFetchingNextPage ? <Spinner label={t("Loading more media…")} /> : null}
            {query.isError && !query.isFetchNextPageError && media.length > 0 ? (
              <ErrorState message={t("Could not refresh media.")} onRetry={() => void query.refetch()} />
            ) : null}
            <div ref={sentinelRef} aria-hidden="true" />
          </div>
        </div>
        {selectionMode ? (
          <footer className="gallery-page__footer">
            <div className="gallery-selection-bar gallery-selection-bar--compact" role="group" aria-label={t("{count} selected", { count: selectedIds.size })}>
              <span className="gallery-selection-bar__status" role="status">{t("{count} selected", { count: selectedIds.size })}</span>
              <button
                type="button"
                className="gallery-selection-bar__action"
                aria-label={t("Restore")}
                title={t("Restore")}
                disabled={selectedIds.size === 0}
                onClick={() => requestAction("restore", [...selectedIds])}
              >
                <RotateCcw size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="gallery-selection-bar__action gallery-selection-bar__action--danger"
                aria-label={t("Permanently delete")}
                title={t("Permanently delete")}
                disabled={selectedIds.size === 0}
                onClick={() => requestAction("delete", [...selectedIds])}
              >
                <Trash2 size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="gallery-selection-bar__cancel"
                aria-label={t("Cancel selection")}
                title={t("Cancel selection")}
                onClick={cancelSelection}
              >
                <X size={20} aria-hidden="true" />
                <span className="gallery-selection-bar__cancel-text">{t("Cancel")}</span>
              </button>
            </div>
          </footer>
        ) : null}
      </main>
      {previewMediaId ? (
        <MediaPreviewDialog
          key={previewMediaId}
          media={media}
          initialMediaId={previewMediaId}
          total={query.data?.pages[0]?.total ?? media.length}
          loadingMore={query.isFetching}
          loadMoreError={query.isFetchNextPageError}
          onLoadMore={query.hasNextPage ? () => { void query.fetchNextPage({ cancelRefetch: false }); } : undefined}
          trashActions={{
            onRestore: (id) => requestAction("restore", [id]),
            onDelete: (id) => requestAction("delete", [id]),
          }}
          onClose={(id) => {
            returnToMediaId.current = id;
            setPreviewMediaId(null);
          }}
        />
      ) : null}
      {action ? (
        <ConfirmationDialog
          title={action.kind === "restore" ? "Restore media?" : "Permanently delete media?"}
          danger={action.kind === "delete"}
          onClose={() => {
            setAction(null);
            cancelSelection();
          }}
          onConfirm={confirmAction}
        >
          {action.ids.length > 1 ? <p>{t("{count} selected", { count: action.ids.length })}</p> : null}
          {t(action.kind === "restore"
            ? "Restore the selected media to your library?"
            : "The selected media will be permanently deleted and cannot be restored.")}
        </ConfirmationDialog>
      ) : null}
    </>
  );
}
