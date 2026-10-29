import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pagination, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../components/ui/Pagination";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Status";
import { showToast } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";
import { useLocale } from "../../context/LocaleContext";
import { cancelRunningUpload, requestUploadRetry } from "../../features/uploads/services/uploadRuntime";
import { uploadService } from "../../features/uploads/services/uploadService";
import { saveUploadFile } from "../../features/uploads/services/uploadFileStore";
import { UploadBatchCard } from "../../features/uploads/components/UploadBatchCard";
import type { UploadBatch, UploadItem } from "../../features/uploads/types";
import "../../features/uploads/uploads.css";

export function UploadManagementPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role.toLowerCase() === "admin";
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState<number>(() => {
    const stored = Number(window.localStorage.getItem("uploads.limit"));
    return PAGE_SIZE_OPTIONS.some((size) => size === stored) ? stored : DEFAULT_PAGE_SIZE;
  });
  const page = Math.floor(offset / limit) + 1;
  const [busyItemIds, setBusyItemIds] = useState<Set<string>>(() => new Set());
  const busyTimeouts = useRef(new Map<string, number>());
  const retryTarget = useRef<{ batch: UploadBatch; item: UploadItem } | null>(null);
  const retryInput = useRef<HTMLInputElement>(null);
  const query = useQuery({
    queryKey: ["uploads", isAdmin, offset, limit],
    queryFn: () => (isAdmin ? uploadService.listAll(offset, limit) : uploadService.list(offset, limit)),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!query.data || query.isPlaceholderData) return;
    const lastOffset = Math.max(0, Math.ceil(query.data.totalItems / limit) - 1) * limit;
    if (offset > lastOffset) setOffset(lastOffset);
  }, [limit, offset, query.data, query.isPlaceholderData]);

  const handlePageSizeChange = (pageSize: number) => {
    setLimit(pageSize);
    setOffset(0);
    window.localStorage.setItem("uploads.limit", String(pageSize));
  };

  useEffect(() => {
    const items = query.data?.items.flatMap((batch) => batch.items) ?? [];
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

  const retry = (batch: UploadBatch, item: UploadItem) => {
    if (item.errorDetails?.includes("no longer available")) {
      retryTarget.current = { batch, item };
      retryInput.current?.click();
      return;
    }
    markBusy(item.id);
    requestUploadRetry(batch.id, item.id);
  };

  const replaceMissingFile = async (file: File | undefined) => {
    const target = retryTarget.current;
    retryTarget.current = null;
    if (!target || !file) return;
    if (file.name !== target.item.originalFilename || file.size !== target.item.fileSizeBytes) {
      showToast.error(t("Choose the same file name and size to retry."));
      return;
    }

    try {
      await saveUploadFile(target.item.id, file);
      markBusy(target.item.id);
      requestUploadRetry(target.batch.id, target.item.id);
    } catch (error) {
      showToast.error(t("Could not save this file for retry."), error instanceof Error ? error.message : undefined);
    }
  };

  const cancel = async (batch: UploadBatch, item: UploadItem) => {
    markBusy(item.id);
    try {
      await cancelRunningUpload(batch.id, item.id);
      await queryClient.invalidateQueries({ queryKey: ["uploads"] });
    } catch (error) {
      setBusyItemIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      const timeout = busyTimeouts.current.get(item.id);
      if (timeout) window.clearTimeout(timeout);
      busyTimeouts.current.delete(item.id);
      showToast.error(t("Could not cancel this upload."), error instanceof Error ? error.message : undefined);
    }
  };

  if (query.isLoading) return <Spinner label="Loading uploads…" />;
  if (query.isError) {
    return <ErrorState message="Could not load uploads." onRetry={() => void query.refetch()} />;
  }

  const data = query.data;
  const batches = data?.items ?? [];

  return (
    <main className="upload-page" aria-labelledby="upload-page-title">
      <div className="upload-page__content">
        <input
          ref={retryInput}
          className="sr-only"
          type="file"
          aria-label={t("Select replacement file")}
          onChange={(event) => {
            void replaceMissingFile(event.currentTarget.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <header className="upload-page__header">
          <div>
            <h1 id="upload-page-title">{t("Upload management")}</h1>
            <p>{t("Watch media uploads from your feed posts and retry failed files.")}</p>
          </div>
        </header>

        {batches.length === 0 ? (
          <EmptyState
            title="No upload batches"
            hint="Share images or videos from the feed composer to track their upload here."
          />
        ) : (
          <div className="upload-list" aria-live="polite">
            {batches.map((batch, index) => (
              <UploadBatchCard
                key={batch.id}
                batch={batch}
                displayId={offset + index + 1}
                showUsername={isAdmin}
                busyItemIds={busyItemIds}
                onRetry={retry}
                onCancel={(itemBatch, item) => void cancel(itemBatch, item)}
              />
            ))}
          </div>
        )}
      </div>
      {data ? (
        <footer className="upload-page__footer">
          <Pagination
            page={page}
            pageSize={limit}
            total={data.totalItems}
            itemLabel="upload batches"
            isFetching={query.isFetching}
            onPageChange={(nextPage) => setOffset((nextPage - 1) * limit)}
            onPageSizeChange={handlePageSizeChange}
          />
        </footer>
      ) : null}
    </main>
  );
}
