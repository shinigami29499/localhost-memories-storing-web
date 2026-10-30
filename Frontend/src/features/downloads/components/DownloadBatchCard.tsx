import { useState } from "react";
import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";
import { Progress } from "@animate-ui/react/primitives/base-ui/progress";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { Download } from "@/components/animate-ui/icons/download";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { X } from "@/components/animate-ui/icons/x";
import { Button } from "../../../components/ui/Button";
import { Pagination } from "../../../components/ui/Pagination";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { cancelDownload, retryDownload, type DownloadBatch } from "../services/downloadQueue";

const ITEMS_PER_PAGE = 5;

export function DownloadBatchCard({ batch, displayId }: { batch: DownloadBatch; displayId: number }) {
  const { t, language } = useLocale();
  const active = batch.items.some((item) => item.status === "Pending" || item.status === "Downloading");
  const sent = batch.items.filter((item) => item.status === "Sent to browser").length;
  const status = active ? "Downloading"
    : batch.items.some((item) => item.status === "Failed") ? "Failed"
    : batch.items.some((item) => item.status === "Cancelled") ? "Cancelled" : "Sent to browser";
  const [expanded, setExpanded] = useState(true);
  const [page, setPage] = useState(1);
  const panelId = `download-batch-${batch.id}`;
  const toggleLabel = t(expanded ? "Hide files" : "View files");
  const retry = (itemId: string) => {
    try {
      retryDownload(itemId);
    } catch (error) {
      showToast.error(t("Could not start this download."), error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <Collapsible.Root render={<article />} className="upload-batch" open={expanded} onOpenChange={setExpanded}>
      <div className="upload-batch__summary">
        <Collapsible.Trigger type="button" className="upload-batch__toggle" aria-label={toggleLabel} title={toggleLabel} aria-controls={panelId}>
          <ChevronDown size={18} aria-hidden="true" />
        </Collapsible.Trigger>
        <div className="upload-batch__field upload-batch__ordinal-field">
          <span className="upload-batch__label">{t("ID")}</span>
          <span className="upload-batch__value">{displayId}</span>
        </div>
        <div className="upload-batch__field upload-batch__created-field">
          <span className="upload-batch__label">{t("Created")}</span>
          <time className="upload-batch__value" dateTime={batch.createdAt}>
            {new Date(batch.createdAt).toLocaleString(language)}
          </time>
        </div>
        <div className="upload-batch__field upload-batch__status-field">
          <span className="upload-batch__label">{t("Status")}</span>
          <span className={`upload-status${status === "Failed" ? " upload-status--failed" : ""}`}>{t(status)}</span>
        </div>
        <div className="upload-batch__field upload-batch__progress-field">
          <span className="upload-batch__label">{t("Sent to browser")}</span>
          <div className="upload-progress__line">
            <Progress.Root value={sent / batch.items.length * 100} aria-label={t("Batch progress")} className="upload-progress">
              <Progress.Track className="upload-progress__track">
                <Progress.Indicator className="upload-progress__indicator" />
              </Progress.Track>
            </Progress.Root>
            <span className="upload-progress__value">{sent}/{batch.items.length}</span>
          </div>
        </div>
        <div className="upload-batch__footer">
          {active ? (
            <Button type="button" variant="ghost" onClick={() => batch.items.forEach((item) => cancelDownload(item.id))}>
              {t("Cancel batch")}
            </Button>
          ) : null}
        </div>
      </div>
      <Collapsible.Panel id={panelId} className="upload-batch__panel">
        <div className="upload-batch__items">
          {batch.items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((item) => {
            const busy = item.status === "Pending" || item.status === "Downloading";
            const percent = item.status === "Sent to browser" ? 100
              : item.fileSizeBytes > 0 ? Math.min(99, Math.floor(item.loaded / item.fileSizeBytes * 100)) : 0;
            const actionLabel = t(item.status === "Sent to browser" ? "Download again: {filename}" : "Retry download: {filename}", { filename: item.originalFilename });
            return (
              <section key={item.id} className="upload-item" aria-label={item.originalFilename}>
                <span className="upload-item__file-type" aria-hidden="true">
                  {item.status === "Downloading"
                    ? <LoaderCircle size={18} className="spinner__wheel" />
                    : <Download size={18} />}
                </span>
                <div className="upload-item__details">
                  <div className="upload-item__name-group">
                    <strong className="upload-item__name" title={item.originalFilename}>{item.originalFilename}</strong>
                    <span className="upload-item__meta">{t(item.status === "Pending" ? "Pending download" : item.status)}</span>
                    {item.error ? <p className="download-item__error" role="alert">{item.error}</p> : null}
                  </div>
                </div>
                <div className="upload-item__controls">
                  <span className="upload-progress__value">{percent}%</span>
                  <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="upload-item__action"
                      aria-label={busy ? t("Cancel download: {filename}", { filename: item.originalFilename }) : actionLabel}
                      title={busy ? t("Cancel download: {filename}", { filename: item.originalFilename }) : actionLabel}
                      onClick={() => busy ? cancelDownload(item.id) : retry(item.id)}
                    >
                      {busy ? <X size={18} aria-hidden="true" /> : <RotateCcw size={18} aria-hidden="true" />}
                    </Button>
                  </AnimateIcon>
                </div>
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
