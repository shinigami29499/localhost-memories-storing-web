import { infiniteQueryOptions, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../../components/ui/Toast";
import { useLocale } from "../../context/LocaleContext";
import { useGalleryWindow } from "../../features/media/hooks/useGalleryWindow";
import { useMediaSelectionDrag } from "../../features/media/hooks/useMediaSelectionDrag";
import { mediaService } from "../../features/media/services/mediaService";
import type { MediaFile, MediaKindFilter } from "../../features/media/types";
import { resolveFocusMediaId } from "./resolveFocusMediaId";

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
export function useTrashPage() {
  const { t, language } = useLocale();
  const queryClient = useQueryClient();
  const filter = undefined;
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
  const [previewGroupKey, setPreviewGroupKey] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [action, setAction] = useState<{ kind: "restore" | "delete"; ids: string[] } | null>(null);
  const restoredIds = useRef<string[]>([]);
  const mounted = useRef(false);
  const actionPending = useRef(false);
  const announceRestoresRef = useRef<() => void>(() => {});
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
    restoredIds.current = [];
    // Close the native modal before opening the portaled confirmation dialog.
    returnToIndex.current = Math.max(0, media.findIndex((item) => item.id === ids[0]));
    returnToMediaId.current = ids[0];
    setPreviewMediaId(null);
    setAction({ kind, ids });
  };

  const announceRestores = () => {
    const ids = restoredIds.current;
    restoredIds.current = [];
    if (ids.length === 0) return;
    showToast.success(t("Media restored successfully"), {
      undo: async () => {
        for (const id of ids) await mediaService.remove(id);
        await queryClient.invalidateQueries({ queryKey: ["media"] });
      },
    });
  };
  announceRestoresRef.current = announceRestores;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (!actionPending.current) announceRestoresRef.current();
    };
  }, []);

  const cancelAction = () => {
    announceRestores();
    setAction(null);
    cancelSelection();
  };

  const confirmAction = async () => {
    if (!action || actionPending.current) return;
    actionPending.current = true;
    const kind = action.kind;
    const affectedIds = kind === "restore" ? restoredIds.current : [];
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
      if (kind === "restore") announceRestores();
      else showToast.success(t("Media permanently deleted"));
      cancelSelection();
    } finally {
      actionPending.current = false;
      if (!mounted.current) announceRestoresRef.current();
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

  return { t, filter, previewMediaId, setPreviewMediaId, setPreviewGroupKey, selectionMode, selectedIds, action, galleryRef, viewport, returnToMediaId, returnToIndex, focusAnnouncement, sentinelRef, query, media, focusMediaId, groups, previewItems, dateFormatter, cancelSelection, toggleSelected, selectionDragHandlers, requestAction, confirmAction, cancelAction };
}
