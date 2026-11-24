import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { DEFAULT_PAGE_SIZE } from "../../components/ui/paginationConstants";
import { showToast } from "../../components/ui/Toast";
import { UI_TIMING } from "../../config/uiTiming";
import { useUnreadUploads } from "../../features/uploads/hooks/useUnreadUploads";
import { useAuthStore } from "../../store/authStore";
import { useLocale } from "../../context/LocaleContext";
import { stopUploadLocally, setUploadPaused } from "../../features/uploads/services/uploadRuntime";
import { uploadService } from "../../features/uploads/services/uploadService";
import { removeUploadFile } from "../../features/uploads/services/uploadFileStore";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import type { UploadBatch, UploadItem } from "../../features/uploads/types";

export function useUploadManagement() {
  const { t } = useLocale();
  const unread = useUnreadUploads();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get("date") ?? "";
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && !Number.isNaN(new Date(`${dateParam}T00:00:00`).getTime()) ? dateParam : "";
  const debouncedDate = useDebouncedValue(selectedDate, UI_TIMING.FILTER_DEBOUNCE);
  const [busyItemIds, setBusyItemIds] = useState<Set<string>>(() => new Set());
  const busyTimeouts = useRef(new Map<string, number>());
  const sentinel = useRef<HTMLDivElement>(null);
  const query = useInfiniteQuery({
    queryKey: ["uploads", "page", selectedDate, user?.id, user?.role],
    enabled: selectedDate === debouncedDate,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const list = ["admin", "superadmin"].includes(user?.role?.toLowerCase() ?? "") ? uploadService.listAll : uploadService.list;
      return list(pageParam, DEFAULT_PAGE_SIZE, selectedDate || undefined, signal);
    },
    getNextPageParam: (lastPage, _pages, lastOffset) =>
      lastPage.items.length > 0 && lastOffset + lastPage.items.length < lastPage.totalItems
        ? lastOffset + DEFAULT_PAGE_SIZE
        : undefined,
  });

  useEffect(() => {
    const target = sentinel.current;
    if (!target || selectedDate !== debouncedDate || !query.hasNextPage || query.isFetchingNextPage || query.isFetchNextPageError) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void query.fetchNextPage({ cancelRefetch: false });
    }, { root: target.closest(".upload-page__content"), rootMargin: "200px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [selectedDate, debouncedDate, query.hasNextPage, query.isFetchingNextPage, query.isFetchNextPageError, query.fetchNextPage]);

  useEffect(() => {
    const items = query.data?.pages.flatMap((page) => page.items.flatMap((batch) => batch.items)) ?? [];
    setBusyItemIds((current) => {
      const next = new Set(current);
      for (const id of current) {
        const status = items.find((item) => item.id === id)?.status;
        if (status && status !== "Failed" && status !== "Pending" && status !== "Uploading") {
          next.delete(id);
        }
      }
      return next;
    });
  }, [query.data]);

  useEffect(() => () => {
    for (const timeout of busyTimeouts.current.values()) window.clearTimeout(timeout);
  }, []);

  const markBusy = (itemId: string) => {
    setBusyItemIds((current) => new Set(current).add(itemId));
    const existing = busyTimeouts.current.get(itemId);
    if (existing) window.clearTimeout(existing);
    const timeout = window.setTimeout(() => {
      setBusyItemIds((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
      busyTimeouts.current.delete(itemId);
    }, 5000);
    busyTimeouts.current.set(itemId, timeout);
  };

  const removeRecord = async (batch: UploadBatch, item?: UploadItem, selected?: UploadItem[]) => {
    const targets = selected ?? (item ? [item] : batch.items);
    for (const target of targets) markBusy(target.id);
    try {
      for (const target of targets) stopUploadLocally(target.id);
      if (selected) await uploadService.deleteRecords(batch.id, selected.map((target) => target.id));
      else await uploadService.deleteRecord(batch.id, item?.id);
      await Promise.allSettled(targets.map((target) => removeUploadFile(target.id)));
      await queryClient.invalidateQueries({ queryKey: ["uploads"] });
    } catch (error) {
      await queryClient.invalidateQueries({ queryKey: ["uploads"] });
      throw error;
    } finally {
      setBusyItemIds((current) => { const next = new Set(current); for (const target of targets) next.delete(target.id); return next; });
    }
  };

  const togglePause = async (batch: UploadBatch, item: UploadItem | undefined, paused: boolean) => {
    const affected = item ? [item] : batch.items.filter((entry) => paused ? entry.status === "Pending" || entry.status === "Uploading" : entry.status === "Paused");
    for (const entry of affected) markBusy(entry.id);
    try { await setUploadPaused(batch.id, item?.id, paused); await queryClient.invalidateQueries({ queryKey: ["uploads"] }); }
    catch (error) { showToast.error(t("Could not change upload pause state."), error instanceof Error ? error.message : undefined); }
    finally { setBusyItemIds((current) => { const next = new Set(current); for (const entry of affected) next.delete(entry.id); return next; }); }
  };


  const data = query.data;
  const batches = data?.pages.flatMap((page) => page.items) ?? [];

  useEffect(() => () => {
    void unread.syncSeenStatus();
  }, [unread.syncSeenStatus]);

  return { t, unread, user, selectedDate, setSearchParams, busyItemIds, sentinel, query, removeRecord, togglePause, batches };
}
