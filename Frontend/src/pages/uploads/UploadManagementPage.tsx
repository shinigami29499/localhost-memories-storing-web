import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { DEFAULT_PAGE_SIZE } from "../../components/ui/Pagination";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Status";
import { Button, DatePicker, showToast } from "../../components/ui";
import { AnimateIcon } from "../../components/animate-ui/icons/icon";
import { CheckCheckIcon } from "../../components/animate-ui/icons/check-check";
import { useUnreadUploads } from "../../features/uploads/hooks/useUnreadUploads";
import { PaperclipIcon } from "../../components/animate-ui/icons/paperclip";
import { UploadIcon } from "../../components/animate-ui/icons/upload";
import { XIcon } from "../../components/animate-ui/icons/x";
import { useAuthStore } from "../../store/authStore";
import { useLocale } from "../../context/LocaleContext";
import { stopUploadLocally, setUploadPaused } from "../../features/uploads/services/uploadRuntime";
import { uploadService } from "../../features/uploads/services/uploadService";
import { removeUploadFile } from "../../features/uploads/services/uploadFileStore";
import { UploadBatchCard } from "../../features/uploads/components/UploadBatchCard";
import type { UploadBatch, UploadItem } from "../../features/uploads/types";
import "../../features/uploads/uploads.css";

export function UploadManagementPage() {
  const { t } = useLocale();
  const unread = useUnreadUploads();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get("date") ?? "";
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && !Number.isNaN(new Date(`${dateParam}T00:00:00`).getTime()) ? dateParam : "";
  const [busyItemIds, setBusyItemIds] = useState<Set<string>>(() => new Set());
  const busyTimeouts = useRef(new Map<string, number>());
  const uploadInput = useRef<HTMLInputElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const query = useInfiniteQuery({
    queryKey: ["uploads", "page", selectedDate, user?.id, user?.role],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const list = user?.role === "admin" ? uploadService.listAll : uploadService.list;
      return list(pageParam, DEFAULT_PAGE_SIZE, selectedDate || undefined);
    },
    getNextPageParam: (lastPage, _pages, lastOffset) =>
      lastPage.items.length > 0 && lastOffset + lastPage.items.length < lastPage.totalItems
        ? lastOffset + DEFAULT_PAGE_SIZE
        : undefined,
  });

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !query.hasNextPage || query.isFetchingNextPage || query.isFetchNextPageError) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void query.fetchNextPage();
    }, { root: target.closest(".upload-page__content"), rootMargin: "200px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [selectedDate, query.hasNextPage, query.isFetchingNextPage, query.isFetchNextPageError, query.fetchNextPage]);

  const clearSelection = () => {
    setSelectedFiles([]);
    if (uploadInput.current) uploadInput.current.value = "";
  };

  const submitFiles = async () => {
    if (selectedFiles.length === 0 || submitting) return;

    setSubmitting(true);
    try {
      const batch = await uploadService.submit(selectedFiles);
      setSelectedFiles([]);
      if (uploadInput.current) uploadInput.current.value = "";
      await queryClient.invalidateQueries({ queryKey: ["uploads"] });
      showToast.success(t("Begin uploading {count} media", { count: selectedFiles.length }), { id: `upload-start:${batch.id}` });
    } catch (error) {
      showToast.error(t("Could not start this upload."), error instanceof Error ? error.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <main className="upload-page" aria-label={t("Upload")}>
      <div className="upload-page__content">
        <div className="upload-page__toolbar">
          <input
            ref={uploadInput}
            id="upload-media-files"
            hidden
            aria-label={t("Select images or videos")}
            type="file"
            accept="image/*,video/*"
            multiple
            disabled={submitting}
            onChange={(event) => setSelectedFiles(Array.from(event.currentTarget.files ?? []))}
          />
          <div className="upload-page__actions">
            <Button
              type="button"
              variant="secondary"
              className="upload-page__attach-button"
              disabled={submitting}
              onClick={() => uploadInput.current?.click()}
            >
              <PaperclipIcon size={18} aria-hidden="true" />
              <span className="upload-page__button-label">{t("Select files")}</span>
            </Button>
            <Button
              type="button"
              className="upload-page__upload-button"
              busy={submitting}
              disabled={selectedFiles.length === 0}
              onClick={() => void submitFiles()}
            >
              {submitting ? null : <UploadIcon size={18} aria-hidden="true" />}
              <span className="upload-page__button-label">{submitting ? t("Starting upload...") : t("Upload media")}</span>
            </Button>
            {selectedFiles.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                className="upload-page__selection-button"
                aria-label={t("Clear selection")}
                title={t("Clear selection")}
                disabled={submitting}
                onClick={clearSelection}
              >
                <XIcon size={18} aria-hidden="true" />
                <span>{t("{count} files selected", { count: selectedFiles.length })}</span>
              </Button>
            ) : null}
          </div>
          <div className="upload-page__filters">
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild><Button type="button" variant="ghost" className="upload-page__activity-button" aria-label={t("Mark all as read")} title={t("Mark all as read")} disabled={!unread.success && !unread.pending && !unread.failed && !unread.hasUnseenBatches(batches)} onClick={() => unread.markAllRead(batches)}>
              <CheckCheckIcon size={18} aria-hidden="true" /><span className="upload-page__button-label">{t("Mark all as read")}</span>
            </Button></AnimateIcon>
            <DatePicker
              className="upload-page__date-filter"
              compactOnMobile
              label={t("Created date")}
              value={selectedDate}
              onChange={(nextDate) => {
                setSearchParams((current) => {
                  const next = new URLSearchParams(current);
                  if (nextDate) next.set("date", nextDate);
                  else next.delete("date");
                  return next;
                });
              }}
            />
          </div>
        </div>

        {query.isPending ? <Spinner page label="Loading uploads..." /> : query.isError && !query.data ? (
          <ErrorState message="Could not load uploads." onRetry={() => void query.refetch()} />
        ) : batches.length === 0 ? (
          <EmptyState
            title={selectedDate ? "No uploads on this date" : "No uploads yet"}
            hint={selectedDate
              ? "Choose another date or clear the filter to see other uploads."
              : "Choose files above and upload them to create your first batch."}
          />
        ) : (
          <>
            <div className="upload-list" aria-live="polite">
              {batches.map((batch, index) => (
                <UploadBatchCard
                  key={batch.id}
                  batch={batch}
                  displayId={index + 1}
                  showUsername
                  avatarUser={user ?? undefined}
                  busyItemIds={busyItemIds}
                  onDelete={(batch, item) => removeRecord(batch, item)}
                  onDeleteMany={(batch, items) => removeRecord(batch, undefined, items)}
                  onPause={(batch, item, paused) => void togglePause(batch, item, paused)}
                />
              ))}
            </div>
            {query.isFetchNextPageError ? (
              <ErrorState message="Could not load more uploads." onRetry={() => void query.fetchNextPage()} />
            ) : query.hasNextPage ? (
              <div ref={sentinel}>{query.isFetchingNextPage ? <Spinner /> : null}</div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
