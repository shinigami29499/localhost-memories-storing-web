import { PageActionBar } from "../../components/layout/PageActionBar";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Highlight, HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { infiniteQueryOptions, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { showToast } from "../../components/ui/Toast";
import { useLocale } from "../../context/LocaleContext";
import { useGalleryWindow } from "../../features/media/hooks/useGalleryWindow";
import { VirtualGalleryGroup } from "./VirtualGalleryGroup";
import { resolveFocusMediaId } from "./resolveFocusMediaId";
import { MediaRetryProvider } from "../../features/media/components/MediaRetryProvider";
import { MediaPreviewDialog } from "../../features/media/components/MediaPreviewDialog";
import { useMediaSelectionDrag } from "../../features/media/hooks/useMediaSelectionDrag";
import { mediaService } from "../../features/media/services/mediaService";
import type { MediaFile, MediaKindFilter } from "../../features/media/types";
import "./gallery.css";
import "../../features/media/components/media.css";

const TRASH_PAGE_SIZE = 20;

const filters: { value: MediaKindFilter; label: string }[] = [
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

function trashQueryOptions(filter?: MediaKindFilter) {
  return infiniteQueryOptions({
    queryKey: ["media", "deleted", filter, TRASH_PAGE_SIZE],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => mediaService.deleted(pageParam, TRASH_PAGE_SIZE, filter),
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    // Deleted media may change while this admin page is unmounted.
    refetchOnMount: "always",
  });
}
export function TrashPage() {
  const { t, language } = useLocale();
  const queryClient = useQueryClient();
  const filter = undefined;
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
  const [previewGroupKey, setPreviewGroupKey] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [action, setAction] = useState<{ kind: "restore" | "delete"; ids: string[] } | null>(null);
  const galleryRef = useRef<HTMLElement>(null);
  const viewport = useGalleryWindow(galleryRef, "trash");
  const returnToMediaId = useRef<string | null>(null);
  const returnToIndex = useRef(0);
  const [focusAnnouncement, setFocusAnnouncement] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const query = useInfiniteQuery(trashQueryOptions(filter));
  useEffect(() => {
    const key = ["media", "deleted", filter, TRASH_PAGE_SIZE] as const;
    const current = queryClient.getQueryData<{ pages?: unknown; pageParams?: unknown }>(key);
    if (!current) return;
    if (!Array.isArray(current.pages) || !Array.isArray(current.pageParams)
      || current.pages.length !== current.pageParams.length
      || current.pages.some((page) => !page || !Array.isArray((page as { items?: unknown }).items))) {
      queryClient.removeQueries({ queryKey: key, exact: true });
      void query.refetch();
    }
  }, [filter, queryClient]);
  const requestRef = useRef(0);
  const [tabLoading, setTabLoading] = useState(false);
  useEffect(() => () => { requestRef.current += 1; }, []);
  const media = useMemo(
    () => (Array.isArray(query.data?.pages) ? query.data.pages : [])
      .filter((page) => page && Array.isArray(page.items)).flatMap((page) => page.items),
    [query.data],
  );
  const focusMediaId = resolveFocusMediaId(media, returnToMediaId.current, returnToIndex.current);
  const groups = useMemo(() => {
    const byDate = new Map<string, { date: Date; items: MediaFile[] }>();
    for (const item of media) {
      const date = new Date(item.deletedAt ?? item.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const group = byDate.get(key);
      if (group) group.items.push(item);
      else byDate.set(key, { date, items: [item] });
    }
    return [...byDate.entries()].sort(([, a], [, b]) => b.date.getTime() - a.date.getTime());
  }, [media]);
  const previewGroup = groups.find(([key]) => key === previewGroupKey);
  const previewItems = previewGroup?.[1].items ?? [];
  const previewNeedsMore = Boolean(previewGroup && previewGroup[0] === groups[groups.length - 1]?.[0] && query.hasNextPage);

  useEffect(() => {
    if (previewNeedsMore && !query.isFetching && !query.isFetchNextPageError) {
      void query.fetchNextPage({ cancelRefetch: false });
    }
  }, [previewNeedsMore, query.isFetching, query.isFetchNextPageError, query.fetchNextPage]);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(language, { year: "numeric", month: "long", day: "numeric" }),
    [language],
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

  const setDragSelection = (mediaId: string, selected: boolean) => {
    setSelectionMode(true);
    setSelectedIds((current) => {
      if (current.has(mediaId) === selected) return current;
      const next = new Set(current);
      if (selected) next.add(mediaId);
      else next.delete(mediaId);
      return next;
    });
  };
  const selectionDragHandlers = useMediaSelectionDrag(
    !action,
    selectionMode,
    (mediaId) => selectedIds.has(mediaId),
    setDragSelection,
  );

  const requestAction = (kind: "restore" | "delete", ids: string[]) => {
    if (ids.length === 0) return;
    // Close the native modal before opening the portaled confirmation dialog.
    returnToIndex.current = Math.max(0, media.findIndex((item) => item.id === ids[0]));
    returnToMediaId.current = ids[0];
    setPreviewMediaId(null);
    setAction({ kind, ids });
  };

  const confirmAction = async () => {
    if (!action) return;
    const kind = action.kind;
    const affectedIds: string[] = [];
    try {
      for (const id of action.ids) {
        if (kind === "restore") await mediaService.restore(id);
        else await mediaService.permanentlyDelete(id);
        affectedIds.push(id);
        // A retry must not repeat successful requests after a partial failure.
        setAction((current) => current ? { ...current, ids: current.ids.filter((item) => item !== id) } : null);
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
      showToast.success(
        t(kind === "restore" ? "Media restored successfully" : "Media permanently deleted"),
        kind === "restore"
          ? {
            undo: async () => {
              for (const id of affectedIds) await mediaService.remove(id);
              await queryClient.invalidateQueries({ queryKey: ["media"] });
            },
          }
          : undefined,
      );
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
    if (query.isFetching && !media.some((item) => item.id === returnToMediaId.current)) return;
    const focusId = resolveFocusMediaId(media, returnToMediaId.current, returnToIndex.current);
    if (!focusId && !query.hasNextPage) {
      setFocusAnnouncement(t("Trash is empty"));
      returnToMediaId.current = null;
      galleryRef.current?.focus({ preventScroll: true });
      return;
    }
    const tiles = Array.from(galleryRef.current?.querySelectorAll<HTMLButtonElement>("[data-media-id]") ?? []);
    const tile = tiles.find((element) => element.dataset.mediaId === focusId);
    if (!tile) return;
    if (focusId !== returnToMediaId.current) setFocusAnnouncement(t("Focused next media item"));
    returnToMediaId.current = null;
    tile.focus({ preventScroll: true });
    tile.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [previewMediaId, action, media, viewport, query.isFetching, query.hasNextPage, t]);

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
      <main ref={galleryRef} tabIndex={-1} className={`gallery-page gallery-page--trash${selectionMode ? " gallery-page--selecting" : ""}`} {...selectionDragHandlers}
        onClickCapture={(event) => {
          selectionDragHandlers.onClickCapture(event);
          if (event.defaultPrevented) return;
          if (!selectionMode || (event.target instanceof Element && event.target.closest("[data-media-id], .gallery-selection-bar"))) return;
          cancelSelection();
        }}>
        <span className="sr-only" role="status" aria-live="polite">{focusAnnouncement}</span>
        <div className="gallery-page__content">
          <div className="gallery-page__inner">
            <div className="gallery-page__tab-panel gallery-page__tab-panel--media">
                <div className="gallery-page__content-body">
                  {query.isLoading ? <Spinner label={t("Loading media…")} /> : null}
                  {query.isError && media.length === 0 ? (
                    <ErrorState message={t("Could not load media.")} onRetry={() => void query.refetch()} />
                  ) : null}
                  {!query.isLoading && !query.isError && media.length === 0 ? (
                    <EmptyState
                      title="Trash is empty"
                      hint="Deleted media will appear here until restored or permanently deleted."
                    />
                  ) : null}

                  {media.length > 0 ? (
                    <MediaRetryProvider key={filter} order={groups.flatMap(([, group]) => group.items.map((item) => item.id))}>
                      <div className="gallery-groups">
                        {groups.map(([key, group]) => (
                          <section key={key} aria-label={dateFormatter.format(group.date)}>
                            <div className="gallery-group__header">
                              <h2 className="gallery-group__title">
                                <time dateTime={`${group.date.getFullYear()}-${String(group.date.getMonth() + 1).padStart(2, "0")}-${String(group.date.getDate()).padStart(2, "0")}`}>
                                  {dateFormatter.format(group.date)}
                                </time>
                              </h2>
                            </div>
                            <VirtualGalleryGroup items={group.items} viewport={viewport} mediaKind={filter}
                              includeDeleted selectionMode={selectionMode} selectedItems={selectedIds}
                              onSelect={toggleSelected} onOpen={(id) => { setPreviewGroupKey(key); setPreviewMediaId(id); }} favoriteBusy={false}
                              pinnedId={focusMediaId}
                    onReachEnd={key === groups[groups.length - 1]?.[0] && query.hasNextPage && !query.isFetching && !query.isFetchNextPageError ? () => { void query.fetchNextPage(); } : undefined} />
                          </section>
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
            
          </div>
        </div>
          <footer className="gallery-page__footer">
            <PageActionBar className="gallery-page__actions gallery-selection-bar--selection-only gallery-selection-bar--trash" role="group" aria-label={t("{count} selected", { count: selectedIds.size })}>
              <span className="gallery-selection-bar__status" role="status">{t("{count} selected", { count: selectedIds.size })}</span>
              <SelectionActions open={selectionMode} mobileVertical>
              <span className="gallery-selection-bar__count" aria-hidden="true">{t("{count} selected", { count: selectedIds.size })}</span>
              <span className="gallery-selection-bar__divider" aria-hidden="true" />
              
              <button
                type="button"
                className="gallery-selection-bar__action"
                aria-label={t("Restore")}
                title={t("Restore")}
                disabled={selectedIds.size === 0}
                onClick={() => requestAction("restore", [...selectedIds])}
              >
                <RotateCcw size={20} aria-hidden="true" />
                <span>{t("Restore")}</span>
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
                <span>{t("Permanently delete")}</span>
              </button>
              </SelectionActions>
            </PageActionBar>
          </footer>
      </main>
      {previewMediaId ? (
        <MediaPreviewDialog
          key={previewMediaId}
          media={previewItems}
          initialMediaId={previewMediaId}
          trashActions={{
            onRestore: (id) => requestAction("restore", [id]),
            onDelete: (id) => requestAction("delete", [id]),
          }}
          onClose={(id) => {
            returnToIndex.current = Math.max(0, media.findIndex((item) => item.id === id));
            returnToMediaId.current = id;
            setPreviewMediaId(null);
          }}
        />
      ) : null}
      {action ? (
        <ConfirmationDialog
          title={action.kind === "restore" ? "Restore media?" : "Permanently delete media?"}
          confirmLabel={action.kind === "restore" ? "Restore" : "Permanently delete"}
          danger={action.kind === "delete"}
          onClose={() => {
            setAction(null);
            cancelSelection();
          }}
          onConfirm={confirmAction}
        >
          <p>{t("{count} selected", { count: action.ids.length })}</p>
          {t(action.kind === "restore"
            ? "Restore the selected media to your library?"
            : "The selected media will be permanently deleted and cannot be restored.")}
        </ConfirmationDialog>
      ) : null}
    </>
  );
}
import { SelectionActions } from "./SelectionActions";
