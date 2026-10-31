import { useState } from "react";
import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";
import { Progress } from "@animate-ui/react/primitives/base-ui/progress";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { Image } from "@/components/animate-ui/icons/image";
import { Video } from "@/components/animate-ui/icons/video";
import { FileText } from "@/components/animate-ui/icons/file-text";
import { formatBytes } from "../../uploads/components/UploadBatchCard";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Pause } from "@/components/animate-ui/icons/pause";
import { Play } from "@/components/animate-ui/icons/play";
import { X } from "@/components/animate-ui/icons/x";
import { Button } from "../../../components/ui/Button";
import { Pagination } from "../../../components/ui/Pagination";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { cancelDownload, pauseDownloadBatch, resumeDownloadBatch, retryDownload, retryHistoryDownload, useDownloadStore, type DownloadBatch } from "../services/downloadQueue";

const ITEMS_PER_PAGE = 5;

export function DownloadBatchCard({ batch, displayId, showUsername = false, canRetry = true }: { batch: DownloadBatch; displayId: number; showUsername?: boolean; canRetry?: boolean }) {
  const { t, language } = useLocale();
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
  const panelId = `download-batch-${batch.id}`;
  const toggleLabel = t(expanded ? "Hide files" : "View files");
  const retry = (itemId: string) => {
    try {
      if (useDownloadStore.getState().batches.some((entry) => entry.id === batch.id)) retryDownload(itemId);
      else retryHistoryDownload(batch, itemId);
    } catch (error) {
      showToast.error(t("Could not start this download."), error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <Collapsible.Root render={<article />} className="upload-batch" open={expanded} onOpenChange={setExpanded}>
      <div className={`upload-batch__summary${showUsername ? " upload-batch__summary--admin" : ""}`}>
        <Collapsible.Trigger type="button" className="upload-batch__toggle" aria-label={toggleLabel} title={toggleLabel} aria-controls={panelId}>
          <ChevronDown size={18} aria-hidden="true" />
        </Collapsible.Trigger>
        <div className="upload-batch__field upload-batch__ordinal-field">
          <span className="upload-batch__label">{t("ID")}</span>
          <span className="upload-batch__value">{displayId}</span>
        </div>
        {showUsername ? <div className="upload-batch__field upload-batch__username-field"><span className="upload-batch__label">{t("Username")}</span><span className="upload-batch__value">{batch.username ?? "--"}</span></div> : null}
        <div className="upload-batch__field upload-batch__created-field">
          <span className="upload-batch__label">{t("Created")}</span>
          <time className="upload-batch__value" dateTime={batch.createdAt}>
            {new Date(batch.createdAt).toLocaleString(language)}
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
            <Button type="button" variant="ghost" className="upload-item__action" aria-label={t("Retry all failed")} title={t("Retry all failed")} disabled={!canRetry || batch.items.filter((item) => item.status === "Failed").length < 1} onClick={() => batch.items.filter((item) => item.status === "Failed").forEach((item) => retry(item.id))}>
              <RotateCcw size={18} aria-hidden="true" />
            </Button>
              <Button type="button" variant="ghost" className="upload-item__action" aria-label={t(paused ? "Resume batch" : "Pause batch")} title={t(paused ? "Resume batch" : "Pause batch")} disabled={!canRetry || (!active && !paused)} onClick={() => {
                try { if (paused) resumeDownloadBatch(batch); else pauseDownloadBatch(batch.id); }
                catch (error) { showToast.error(t("Could not start this download."), error instanceof Error ? error.message : undefined); }
              }}>{paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}</Button>
              <Button type="button" variant="ghost" className="upload-item__action upload-item__action--cancel" aria-label={t("Cancel batch")} title={t("Cancel batch")} disabled={!canRetry || (!active && !paused)} onClick={() => {
                if (paused && !useDownloadStore.getState().batches.some((entry) => entry.id === batch.id)) useDownloadStore.setState((state) => ({ batches: [batch, ...state.batches] }));
                batch.items.forEach((item) => cancelDownload(item.id));
              }}><X size={18} aria-hidden="true" /></Button>
        </div>
      </div>
      <Collapsible.Panel id={panelId} className="upload-batch__panel">
        <div className="upload-batch__items">
          {batch.items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((item) => {
            const busy = item.status === "Pending" || item.status === "Downloading";
            const percent = item.status === "Sent to browser" ? 100
              : item.fileSizeBytes > 0 ? Math.min(99, Math.floor(item.loaded / item.fileSizeBytes * 100)) : 0;
            const actionLabel = t("Retry download: {filename}", { filename: item.originalFilename });
            const itemStatus = item.status === "Sent to browser" ? "Success" : item.status === "Pending" ? "Pending download" : item.status;
            const itemStatusClass = item.status === "Sent to browser" ? "success" : item.status.toLowerCase();
            const FileTypeIcon = /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(item.originalFilename) ? Video
              : /\.(png|jpe?g|gif|webp|avif|heic|bmp)$/i.test(item.originalFilename) ? Image : FileText;
            return (
              <section key={item.id} className="upload-item" aria-label={item.originalFilename}>
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
                      <span className={`upload-status upload-status--${itemStatusClass} upload-item__status`}>{t(itemStatus)}</span>
                    </div>
                  </div>
                </div>
                <div className="upload-item__controls">
                  <span className="upload-progress__value">{percent}%</span>
                  {canRetry ? <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="upload-item__action"
                      disabled={!busy && item.status !== "Failed"}
                      aria-label={busy ? t("Cancel download: {filename}", { filename: item.originalFilename }) : actionLabel}
                      title={busy ? t("Cancel download: {filename}", { filename: item.originalFilename }) : actionLabel}
                      onClick={() => busy ? cancelDownload(item.id) : retry(item.id)}
                    >
                      {busy ? <X size={18} aria-hidden="true" /> : <RotateCcw size={18} aria-hidden="true" />}
                    </Button>
                  </AnimateIcon> : null}
                </div>
                <div className="upload-item__progress-row">
                  <Progress.Root value={percent} aria-label={t("Progress for {name}", { name: item.originalFilename })} aria-valuetext={`${percent}%`} className="upload-progress">
                    <Progress.Track className="upload-progress__track"><Progress.Indicator className="upload-progress__indicator" /></Progress.Track>
                  </Progress.Root>
                </div>
                {item.error ? <p className="upload-item__error" role="alert">{item.error}</p> : null}
              </section>
            );
          })}
        </div>
        {batch.items.length > ITEMS_PER_PAGE ? (
          <Pagination page={page} pageSize={ITEMS_PER_PAGE} total={batch.items.length} onPageChange={setPage} itemLabel="files" />
        ) : null}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
