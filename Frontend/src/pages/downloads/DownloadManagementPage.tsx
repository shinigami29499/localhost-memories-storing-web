import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "@animate-ui/react/utils/motion";
import { useQuery } from "@tanstack/react-query";
import { ErrorState, Spinner } from "../../components/ui/Status";
import { Pagination, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../components/ui/Pagination";
import { Button, DatePicker } from "../../components/ui";
import { AnimateIcon } from "../../components/animate-ui/icons/icon";
import { Image } from "../../components/animate-ui/icons/image";
import { ChartColumnIcon } from "../../components/animate-ui/icons/chart-column";
import { CheckCheckIcon } from "../../components/animate-ui/icons/check-check";
import { useUnreadDownloads } from "../../features/downloads/hooks/useUnreadDownloads";
import { DownloadActivityDialog } from "../../features/downloads/components/DownloadActivityDialog";
import { useLocale } from "../../context/LocaleContext";
import { DownloadBatchCard } from "../../features/downloads/components/DownloadBatchCard";
import { useDownloadBatches } from "../../features/downloads/hooks/useDownloadBatches";
import { useAuthStore } from "../../store/authStore";
import { userService } from "../../features/users/services/userService";
import "../../features/uploads/uploads.css";
import "./downloads.css";

export function DownloadManagementPage() {
  const { t } = useLocale();
  const unread = useUnreadDownloads();
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const highlightBatchId = (location.state as { highlightBatchId?: string } | null)?.highlightBatchId;
  const handledHighlight = useRef<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role.toLowerCase() === "admin";
  const usersQuery = useQuery({
    queryKey: ["users", "upload-avatars"],
    queryFn: userService.list,
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });
  const avatarSeedsByUsername = new Map(
    (usersQuery.data ?? []).map((account) => [account.username.toLowerCase(), account.avatarSeed] as const),
  );
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [limit, setLimit] = useState<number>(() => {
    const stored = Number(window.localStorage.getItem("downloads.limit"));
    return PAGE_SIZE_OPTIONS.some((size) => size === stored) ? stored : DEFAULT_PAGE_SIZE;
  });
  const { batches, query, batchesQuery, mergedBatches } = useDownloadBatches();

  const highlightIndex = mergedBatches.findIndex((batch) => batch.id === highlightBatchId);
  useEffect(() => {
    if (!highlightBatchId || highlightIndex < 0 || handledHighlight.current === location.key) return;
    handledHighlight.current = location.key;
    setSelectedDate("");
    setPage(Math.floor(highlightIndex / limit) + 1);
  }, [highlightBatchId, highlightIndex, limit, location.key]);
  const allBatches = mergedBatches
    .filter((batch) => {
      if (!selectedDate) return true;
      const date = new Date(batch.createdAt);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` === selectedDate;
    });
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
            <h1 id="download-page-title">{t("Download")}<span className="brand__dot">.</span></h1>
            <p>{t("Download original images and videos.")}</p>
          </div>
        </header>
        <div className="upload-page__toolbar">
          <div className="upload-page__actions">
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <Link className="btn btn--primary upload-page__upload-button download-page__gallery-link" to="/library/gallery"><Image size={18} aria-hidden="true" /><span className="upload-page__button-label">{t("Browse gallery")}</span></Link>
            </AnimateIcon>
          </div>
          <div className="upload-page__filters">
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild><Button type="button" variant="ghost" className="upload-page__activity-button" aria-label={t("Mark all as read")} title={t("Mark all as read")} disabled={!unread.success && !unread.pending && !unread.failed} onClick={unread.markAllRead}>
              <CheckCheckIcon size={18} aria-hidden="true" /><span className="upload-page__button-label">{t("Mark all as read")}</span>
            </Button></AnimateIcon>
            <DatePicker className="upload-page__date-filter" compactOnMobile label={t("Created date")} value={selectedDate} onChange={(date) => { setSelectedDate(date); setPage(1); }} />
            <Button type="button" variant="ghost" className="upload-page__activity-button" title={t("Download activity")} onClick={() => setActivityOpen(true)}>
              <ChartColumnIcon size={18} aria-hidden="true" /><span className="upload-page__button-label">{t("Activity")}</span>
            </Button>
          </div>
        </div>
        {activityOpen ? <DownloadActivityDialog onClose={() => setActivityOpen(false)} /> : null}
        <section className="download-page__section" aria-label={t("Downloads")}>
          {(query.isPending || batchesQuery.isPending) && batches.length === 0 ? <Spinner label="Loading download history..." /> : (query.isError || batchesQuery.isError) && batches.length === 0 ? (
            <ErrorState message="Could not load download history." onRetry={() => { void query.refetch(); void batchesQuery.refetch(); }} />
          ) : totalItems === 0 ? (
            null
          ) : (
            <div className="upload-list" aria-live="polite">
              {visibleBatches.map((batch, index) => (
                <motion.div key={`${batch.userId}:${batch.id}`} className="download-page__batch" initial={batch.id === highlightBatchId && !reducedMotion ? { boxShadow: "0 0 0 3px var(--upload-status-success-border, #2fa66a)" } : false} animate={{ boxShadow: "0 0 0 0px transparent" }} transition={{ ...motionTokens.transition.reveal, delay: 0.8 }}>
                  <DownloadBatchCard batch={batch} displayId={(page - 1) * limit + index + 1} showUsername avatarSeed={batch.username ? avatarSeedsByUsername.get(batch.username.toLowerCase()) : undefined} canRetry={!batch.userId || batch.userId === user?.id} />
                </motion.div>
              ))}
            </div>
          )}
          {(query.isError || batchesQuery.isError) && batches.length > 0 ? <ErrorState message="Could not load download history." onRetry={() => { void query.refetch(); void batchesQuery.refetch(); }} /> : null}
        </section>
      </div>
      {totalItems > 0 ? (
        <footer className="upload-page__footer">
          <Pagination page={page} pageSize={limit} total={totalItems} onPageChange={setPage} itemLabel="download batches"
            onPageSizeChange={(size) => {
              setLimit(size);
              setPage(1);
              window.localStorage.setItem("downloads.limit", String(size));
            }} />
        </footer>
      ) : null}
    </main>
  );
}
