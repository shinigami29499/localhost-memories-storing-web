import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Status";
import { Pagination, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../components/ui/Pagination";
import { Button, DatePicker } from "../../components/ui";
import { AnimateIcon } from "../../components/animate-ui/icons/icon";
import { Image } from "../../components/animate-ui/icons/image";
import { ChartColumnIcon } from "../../components/animate-ui/icons/chart-column";
import { DownloadActivityDialog } from "../../features/downloads/components/DownloadActivityDialog";
import { useLocale } from "../../context/LocaleContext";
import { DownloadBatchCard } from "../../features/downloads/components/DownloadBatchCard";
import { useDownloadStore, type DownloadBatch } from "../../features/downloads/services/downloadQueue";
import { listAllDownloadBatches, listAllDownloadHistory } from "../../features/downloads/services/downloadHistory";
import { useAuthStore } from "../../store/authStore";
import "../../features/uploads/uploads.css";
import "./downloads.css";

export function DownloadManagementPage() {
  const { t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const batches = useDownloadStore((state) => state.batches);
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [limit, setLimit] = useState<number>(() => {
    const stored = Number(window.localStorage.getItem("downloads.limit"));
    return PAGE_SIZE_OPTIONS.some((size) => size === stored) ? stored : DEFAULT_PAGE_SIZE;
  });
  const query = useQuery({
    queryKey: ["download-history", user?.id],
    queryFn: listAllDownloadHistory,
    refetchInterval: 5000,
    enabled: Boolean(user?.id),
  });

  const batchesQuery = useQuery({
    queryKey: ["download-batches", user?.id],
    queryFn: listAllDownloadBatches,
    refetchInterval: 5000,
    enabled: Boolean(user?.id),
  });

  const grouped = new Map<string, NonNullable<typeof query.data>>();
  for (const record of query.data ?? []) {
    const key = record.batchId ? `${record.userId}:${record.batchId}` : record.id;
    const group = grouped.get(key) ?? [];
    group.push(record);
    grouped.set(key, group);
  }
  const history: DownloadBatch[] = [...grouped.values()].map((records) => {
    const first = records[0];
    const uniqueRecords = [...new Map(records.map((record) => [record.mediaId, record])).values()];
    return {
      id: first.batchId ?? first.id,
      createdAt: records[records.length - 1].createdAt,
      username: first.username,
      userId: first.userId,
      items: uniqueRecords.map((record) => ({
        id: record.id, mediaId: record.mediaId, originalFilename: record.originalFilename,
        fileSizeBytes: 0, includeDeleted: false, status: "Failed" as const, loaded: 0,
      })),
    };
  });
  const savedBatches = (batchesQuery.data ?? []).map((batch) => ({
    ...batch,
    items: batch.items.map((item) => item.status === "Recorded"
      ? { ...item, status: "Failed" as const, loaded: 0 }
      : item.status === "Pending" || item.status === "Downloading"
        ? { ...item, status: "Cancelled" as const, loaded: 0 }
        : item),
  }));
  const allBatches = [...batches, ...savedBatches.filter((batch) => !batches.some((current) => current.id === batch.id)),
    ...history.filter((batch) => !batches.some((current) => current.id === batch.id) && !savedBatches.some((saved) => saved.id === batch.id))]
    .filter((batch) => {
      if (!selectedDate) return true;
      const date = new Date(batch.createdAt);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` === selectedDate;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const totalItems = allBatches.length;
  const visibleBatches = allBatches.slice((page - 1) * limit, page * limit);
  useEffect(() => {
    if (!query.data) return;
    setPage((current) => Math.min(current, Math.max(1, Math.ceil(totalItems / limit))));
  }, [limit, query.data, totalItems]);

  return (
    <main className="upload-page" aria-labelledby="download-page-title">
      <div className="upload-page__content">
        <header className="upload-page__header">
          <div>
            <p className="upload-page__eyebrow">{t("Sync")}</p>
            <h1 id="download-page-title">{t("Download management")}<span className="brand__dot">.</span></h1>
            <p>{t("Download original images and videos, one file at a time.")}</p>
          </div>
        </header>
        <div className="upload-page__toolbar">
          <div className="upload-page__actions">
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <Link className="btn btn--primary upload-page__upload-button download-page__gallery-link" to="/library/gallery"><Image size={18} aria-hidden="true" />{t("Browse gallery")}</Link>
            </AnimateIcon>
          </div>
          <div className="upload-page__filters">
            <DatePicker className="upload-page__date-filter" label={t("Created date")} value={selectedDate} onChange={(date) => { setSelectedDate(date); setPage(1); }} />
            <Button type="button" variant="ghost" className="upload-page__activity-button" title={t("Download activity")} onClick={() => setActivityOpen(true)}>
              <ChartColumnIcon size={18} aria-hidden="true" />{t("Activity")}
            </Button>
          </div>
        </div>
        {activityOpen ? <DownloadActivityDialog onClose={() => setActivityOpen(false)} /> : null}
        <section className="download-page__section" aria-label={t("Downloads")}>
          {(query.isPending || batchesQuery.isPending) && batches.length === 0 ? <Spinner label="Loading download history..." /> : (query.isError || batchesQuery.isError) && batches.length === 0 ? (
            <ErrorState message="Could not load download history." onRetry={() => { void query.refetch(); void batchesQuery.refetch(); }} />
          ) : totalItems === 0 ? (
            <EmptyState title={selectedDate ? "No downloads on this date" : "No downloads yet"} hint={selectedDate ? "Choose another date or remove the filter." : "Browse the gallery to download images and videos."} />
          ) : (
            <div className="upload-list" aria-live="polite">
              {visibleBatches.map((batch, index) => (
                <DownloadBatchCard key={`${batch.userId}:${batch.id}`} batch={batch} displayId={(page - 1) * limit + index + 1} showUsername canRetry={!batch.userId || batch.userId === user?.id} />
              ))}
            </div>
          )}
          {(query.isError || batchesQuery.isError) && batches.length > 0 ? <ErrorState message="Could not load download history." onRetry={() => { void query.refetch(); void batchesQuery.refetch(); }} /> : null}
        </section>
      </div>
      {totalItems > 0 ? (
        <footer className="upload-page__footer">
          <Pagination page={page} pageSize={limit} total={totalItems} onPageChange={setPage} itemLabel="download batches"
            isFetching={query.isFetching} onPageSizeChange={(size) => {
              setLimit(size);
              setPage(1);
              window.localStorage.setItem("downloads.limit", String(size));
            }} />
        </footer>
      ) : null}
    </main>
  );
}
