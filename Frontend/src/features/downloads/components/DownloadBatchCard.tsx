import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";
import { Progress } from "@animate-ui/react/primitives/base-ui/progress";
import { motionTokens } from "@animate-ui/react/utils/motion";
import { Image } from "@/components/animate-ui/icons/image";
import { Video } from "@/components/animate-ui/icons/video";
import { FileText } from "@/components/animate-ui/icons/file-text";
import { formatBytes, formatCompactDate } from "../../uploads/components/UploadBatchCard";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { Pause } from "@/components/animate-ui/icons/pause";
import { Play } from "@/components/animate-ui/icons/play";
import { Button } from "../../../components/ui/Button";
import { Pagination } from "../../../components/ui/Pagination";
import { ConfirmationDialog } from "../../../components/ui/ConfirmationDialog";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { showToast } from "../../../components/ui/Toast";
import { useAuthStore } from "../../../store/authStore";
import { downloadCategory, downloadReadKey, useDownloadReadStore } from "../hooks/useUnreadDownloads";
import { markDownloadBatchViewed, saveDownloadBatch } from "../services/downloadHistory";
import { useLocale } from "../../../context/LocaleContext";
import { pauseDownloadBatch, pauseDownloadItem, resumeDownloadBatch, resumeDownloadItem, removeDownloadRecord, retryDownload, retryHistoryDownload, useDownloadStore, type DownloadBatch } from "../services/downloadQueue";

const ITEMS_PER_PAGE = 5;

export function DownloadBatchCard({ batch, showUsername = false, avatarSeed, canRetry = true }: { batch: DownloadBatch; displayId: number; showUsername?: boolean; avatarSeed?: string | null; canRetry?: boolean }) {
  const { t, language } = useLocale();
  const userId = useAuthStore((state) => state.user?.id) ?? "";
  const read = useDownloadReadStore((state) => state.read);
  const markRead = useDownloadReadStore((state) => state.markRead);
  const unreadItems = batch.viewedAt ? [] : batch.items.filter((item) => { const category = downloadCategory(item); return category && read[downloadReadKey(userId, batch, item)] !== category; });
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedItems = batch.items.filter (item => selectedIds.has(item.id));
  const actionItems = selectedItems.length ? selectedItems : batch.items;
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; filename: string } | "batch" | null>(null);
  const active = batch.items.some((item) => item.status === "Pending" || item.status === "Downloading");
  const paused = batch.items.some((item) => item.status === "Paused");
  const sent = batch.items.filter((item) => item.status === "Sent to browser").length;
  const status = batch.items.some((item) => item.status === "Downloading") ? "Downloading"
    : batch.items.some((item) => item.status === "Pending") ? "Pending download"
    : paused ? "Paused"
    : batch.items.some((item) => item.status === "Failed") ? "Failed"
    : batch.items.some((item) => item.status === "Cancelled") ? "Cancelled"
    : "Completed";
  const [expanded, setExpanded] = useState(active);
  const [page, setPage] = useState(1);
  const filteredItems = batch.items;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE)));
  const panelId = `download-batch-${batch.id}`;
  const markBatchRead = () => {
    if (!unreadItems.length) return;
    markRead(userId, batch, unreadItems);
    void (async () => {
      if (useDownloadStore.getState().batches.some((entry) => entry.id === batch.id)) await saveDownloadBatch(batch);
      await markDownloadBatchViewed(batch.id);
      useDownloadStore.setState((state) => ({
        batches: state.batches.map((entry) => entry.id === batch.id ? { ...entry, viewedAt: new Date().toISOString() } : entry),
      }));
      await queryClient.invalidateQueries({ queryKey: ["download-batches"] });
    })().catch(() => undefined);
  };
  const toggleLabel = t(expanded ? "Hide files" : "View files");
  const retry = (itemId: string) => {
    try {
      if (useDownloadStore.getState().batches.some((entry) => entry.id === batch.id)) retryDownload(itemId);
      else retryHistoryDownload(batch, itemId);
    } catch (error) {
      showToast.error(t("Could not start this download."), error instanceof Error ? error.message : undefined);
    }
  };

  const remove = async (itemId?: string, itemIds?: string[]) => {
    setDeleting(true);
    try {
      await removeDownloadRecord(batch, itemId, itemIds);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["download-history"] }), queryClient.invalidateQueries({ queryKey: ["download-batches"] })]);
    } catch (error) {
      showToast.error(t("Could not delete download record."), error instanceof Error ? error.message : undefined);
    } finally { setDeleting(false); }
  };

  return (
    <Collapsible.Root render={<article />} className="upload-batch" open={expanded} onOpenChange={setExpanded}>
      <div
        className={`upload-batch__summary${showUsername ? " upload-batch__summary--admin" : ""}${unreadItems.length ? " upload-batch__summary--unread" : ""}`}
        onMouseEnter={markBatchRead}
        onFocus={markBatchRead}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button, input, a, select, [role='combobox']")) return;
          setExpanded((current) => !current);
        }}
      >
        <Collapsible.Trigger type="button" className="upload-batch__toggle" aria-label={toggleLabel} title={toggleLabel} aria-controls={panelId}>
          <span className="upload-batch__toggle-label">{toggleLabel}</span>
        </Collapsible.Trigger>
        {canRetry ? <input className="upload-item__select upload-batch__select-all" type="checkbox" aria-label={t("Select all files")} title={t("Select all files")} disabled={filteredItems.length === 0} checked={filteredItems.length > 0 && selectedItems.length === filteredItems.length} ref={(element) => { if (element) element.indeterminate = selectedItems.length > 0 && selectedItems.length < filteredItems.length; }} onChange={(event) => setSelectedIds(event.target.checked ? new Set(filteredItems.map((item) => item.id)) : new Set())} /> : null}
        {showUsername ? <UserAvatar user={{ id: batch.userId ?? batch.id, username: batch.username ?? undefined, avatarSeed }} className="upload-batch__owner-avatar" /> : null}
        {showUsername ? <div className="upload-batch__field upload-batch__username-field"><span className="upload-batch__label">{t("Username")}</span><span className="upload-batch__value">{batch.username ?? "--"}</span></div> : null}
        <div className="upload-batch__field upload-batch__created-field">
          <span className="upload-batch__label upload-batch__date-label">{t("Date & Time")}</span>
          <span className="upload-batch__label upload-batch__date-label-mobile">{t("Date")}</span>
          <time className="upload-batch__value" dateTime={batch.createdAt}>
            <span className="upload-batch__date-time">{new Date(batch.createdAt).toLocaleString(language)}</span>
            <span className="upload-batch__date-only">{new Date(batch.createdAt).toLocaleDateString(language)}</span>
            <span className="upload-batch__date-value">{formatCompactDate(batch.createdAt)}</span>
            <span className="upload-batch__time-value">{new Date(batch.createdAt).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" })}</span>
          </time>
        </div>
        <div className="upload-batch__field upload-batch__status-field">
          <span className="upload-batch__label">{t("Status")}</span>
          <span className={`upload-status upload-status--${status.toLowerCase().replaceAll(" ", "-")}`}>{t(status)}</span>
        </div>
        <div className="upload-batch__field upload-batch__progress-field">
          <span className="upload-batch__label">{t("Batch progress")}</span>
          <div className="upload-progress__line">
            <Progress.Root value={batch.items.length ? sent / batch.items.length * 100 : 0} aria-label={t("Batch progress")} aria-valuetext={`${sent}/${batch.items.length}`} className="upload-progress">
              <Progress.Track className="upload-progress__track">
                <Progress.Indicator className="upload-progress__indicator" />
              </Progress.Track>
            </Progress.Root>
            <span className="upload-progress__value">{sent}/{batch.items.length}</span>
          </div>
        </div>
        <div className="upload-batch__footer">
            <Button type="button" variant="ghost" className="upload-item__action" aria-label={t("Retry all failed")} title={t("Retry all failed")} disabled={!canRetry || actionItems.filter((item) => item.status === "Failed").length < 1} onClick={() => actionItems.filter((item) => item.status === "Failed").forEach((item) => retry(item.id))}>
              <RotateCcw size={18} aria-hidden="true" />
            </Button>
              <Button type="button" variant="ghost" className="upload-item__action" aria-label={t(!active && paused ? "Resume batch" : "Pause batch")} title={t(!active && paused ? "Resume batch" : "Pause batch")} disabled={!canRetry || (!active && !paused)} onClick={() => {
                try { if (active) pauseDownloadBatch(batch.id); else resumeDownloadBatch(batch); }
                catch (error) { showToast.error(t("Could not start this download."), error instanceof Error ? error.message : undefined); }
              }}>{!active && paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}</Button>
              <Button type="button" variant="ghost" className="upload-item__action upload-item__action--delete" aria-label={t("Delete batch record")} title={t("Delete batch record")} disabled={!canRetry || deleting || actionItems.some((item) => item.status === "Sent to browser")} onClick={() => setDeleteTarget("batch")}><Trash2 size={18} aria-hidden="true" /></Button>

        </div>
      </div>
      <Collapsible.Panel id={panelId} className="upload-batch__panel" keepMounted transition={motionTokens.transition.reveal}>
        <div className="upload-batch__items">
          {filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => {
            const busy = item.status === "Pending" || item.status === "Downloading";
            const percent = item.status === "Sent to browser" ? 100
              : item.fileSizeBytes > 0 ? Math.min(99, Math.floor(item.loaded / item.fileSizeBytes * 100)) : 0;
            const actionLabel = t("Retry download: {filename}", { filename: item.originalFilename });
            const itemStatus = item.status === "Sent to browser" ? "Success" : item.status === "Pending" ? "Pending download" : item.status;
            const itemStatusClass = item.status === "Sent to browser" ? "success" : item.status.toLowerCase();
            const FileTypeIcon = /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(item.originalFilename) ? Video
              : /\.(png|jpe?g|gif|webp|avif|heic|bmp)$/i.test(item.originalFilename) ? Image : FileText;
            return (
              <section key={item.id} className={`upload-item${canRetry ? " upload-item--selectable" : ""}${showUsername ? " upload-item--admin" : ""}`} aria-label={item.originalFilename} onClick={(event) => {
                if (!canRetry || (event.target as HTMLElement).closest("button, input, a, select")) return;
                setSelectedIds((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; });
              }}>
                {canRetry ? <input className="upload-item__select" type="checkbox" aria-label={t("Select {name}", { name: item.originalFilename })} checked={selectedIds.has(item.id)} onChange={(event) => setSelectedIds((current) => { const next = new Set(current); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next; })} /> : null}
                <span className="upload-item__file-type" aria-hidden="true">
                  {item.status === "Downloading"
                    ? <LoaderCircle size={18} className="spinner__wheel" />
                    : <FileTypeIcon size={18} />}
                </span>
                <div className="upload-item__details">
                  <div className="upload-item__name-group">
                    <strong className="upload-item__name" title={item.originalFilename}>{item.originalFilename}</strong>
                    <div className="upload-item__meta-row">
                      {item.fileSizeBytes > 0 ? <span className="upload-item__meta">{formatBytes(item.fileSizeBytes)}</span> : null}
                    </div>
                  </div>
                </div>
                <div className="upload-item__date upload-batch__field">
                  <span className="upload-batch__label upload-batch__date-label">{t("Date & Time")}</span>
                  <span className="upload-batch__label upload-batch__date-label-mobile">{t("Date")}</span>
                  <time className="upload-batch__value" dateTime={batch.createdAt}>
                    <span className="upload-batch__date-time">{new Date(batch.createdAt).toLocaleString(language)}</span>
                    <span className="upload-batch__date-only">{new Date(batch.createdAt).toLocaleDateString(language)}</span>
                  </time>
                </div>
                <div className="upload-item__status-field upload-batch__field">
                  <span className="upload-batch__label">{t("Status")}</span>
                  <span className={`upload-status upload-status--${itemStatusClass}`} aria-label={t(itemStatus)}>{t(itemStatus)}</span>
                </div>
                <div className="upload-item__controls">
                  {canRetry ? <div className="upload-item__actions">
                    <Button type="button" variant="ghost" className="upload-item__action" disabled={deleting || item.status !== "Failed"} aria-label={actionLabel} title={actionLabel} onClick={() => retry(item.id)}><RotateCcw size={18} aria-hidden="true" /></Button>
                    <Button type="button" variant="ghost" className="upload-item__action" disabled={deleting || (!busy && item.status !== "Paused")} aria-label={t(item.status === "Paused" ? "Resume {name}" : "Pause {name}", { name: item.originalFilename })} title={t(item.status === "Paused" ? "Resume {name}" : "Pause {name}", { name: item.originalFilename })} onClick={() => { try { if (item.status === "Paused") resumeDownloadItem(batch, item.id); else pauseDownloadItem(item.id); } catch (error) { showToast.error(t("Could not start this download."), error instanceof Error ? error.message : undefined); } }}>{item.status === "Paused" ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}</Button>
                    <Button type="button" variant="ghost" className="upload-item__action upload-item__action--delete" disabled={deleting || item.status === "Sent to browser"} aria-label={t("Delete record: {filename}", { filename: item.originalFilename })} title={t("Delete record: {filename}", { filename: item.originalFilename })} onClick={() => setDeleteTarget({ id: item.id, filename: item.originalFilename })}><Trash2 size={18} aria-hidden="true" /></Button>
                  </div> : null}
                </div>
                <div className="upload-item__progress-row upload-batch__field">
                  <span className="upload-batch__label">{t("Progress")}</span>
                  <Progress.Root value={percent} aria-label={t("Progress for {name}", { name: item.originalFilename })} aria-valuetext={`${percent}%`} className="upload-progress">
                    <Progress.Track className="upload-progress__track"><Progress.Indicator className="upload-progress__indicator" /></Progress.Track>
                  </Progress.Root>
                </div>
                {item.error ? <p className="upload-item__error" role="alert">{item.error}</p> : null}
              </section>
            );
          })}
        </div>
        {filteredItems.length > ITEMS_PER_PAGE ? (
          <Pagination page={currentPage} pageSize={ITEMS_PER_PAGE} total={filteredItems.length} onPageChange={setPage} itemLabel="files" />
        ) : null}
      </Collapsible.Panel>
      {deleteTarget ? (
        <ConfirmationDialog title="Delete record" danger onClose={() => setDeleteTarget(null)} onConfirm={async () => { if (deleteTarget === "batch" && selectedItems.length) { await remove(undefined, selectedItems.map((item) => item.id)); setSelectedIds(new Set()); } else await remove(deleteTarget === "batch" ? undefined : deleteTarget.id); }}>
          {deleteTarget === "batch" ? t(selectedItems.length ? "Delete the selected file records?" : "Delete this batch record and its file records?") : t("Delete the record for {filename}?", { filename: deleteTarget.filename })}
        </ConfirmationDialog>
      ) : null}
    </Collapsible.Root>
  );
}
