import { useState } from "react";
import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";
import { Image } from "@/components/animate-ui/icons/image";
import { Video } from "@/components/animate-ui/icons/video";
import { FileText } from "@/components/animate-ui/icons/file-text";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Button } from "../../../components/ui/Button";
import { showToast } from "../../../components/ui/Toast";
import { enqueueDownloads } from "../services/downloadQueue";
import { Pagination } from "../../../components/ui/Pagination";
import { useLocale } from "../../../context/LocaleContext";
import type { DownloadRecord } from "../services/downloadHistory";

export function DownloadHistoryBatch({ records, showUsername }: { records: DownloadRecord[]; displayId: number; showUsername: boolean }) {
  const { t, language } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const first = records[0];
  const panelId = `download-history-${first.id}`;
  const label = t(expanded ? "Hide history" : "View history");
  return (
    <Collapsible.Root render={<article />} className="upload-batch" open={expanded} onOpenChange={setExpanded}>
      <div className={`upload-batch__summary${showUsername ? " upload-batch__summary--admin" : ""}`}>
        <Collapsible.Trigger type="button" className="upload-batch__toggle" aria-label={label} title={label} aria-controls={panelId}>
          <ChevronDown size={18} aria-hidden="true" />
        </Collapsible.Trigger>
        {showUsername ? <div className="upload-batch__field upload-batch__username-field"><span className="upload-batch__label">{t("Username")}</span><span className="upload-batch__value">{first.username}</span></div> : null}
        <div className="upload-batch__field upload-batch__created-field"><span className="upload-batch__label">{t("Date & Time")}</span><time className="upload-batch__value" dateTime={first.createdAt}>{new Date(first.createdAt).toLocaleString(language)}</time></div>
        <div className="upload-batch__field upload-batch__status-field"><span className="upload-batch__label">{t("Status")}</span><span className="upload-status">{t("Recorded")}</span></div>
        <div className="upload-batch__field upload-batch__progress-field"><span className="upload-batch__label">{t("Files")}</span><span className="upload-batch__value">{records.length}</span></div>
      </div>
      <Collapsible.Panel id={panelId} className="upload-batch__panel">
        <div className="upload-batch__items">
          {records.slice((page - 1) * 5, page * 5).map((record) => {
            const FileTypeIcon = /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(record.originalFilename) ? Video
              : /\.(png|jpe?g|gif|webp|avif|heic|bmp)$/i.test(record.originalFilename) ? Image : FileText;
            return (
              <section className="upload-item" key={record.id} aria-label={record.originalFilename}>
                <span className="upload-item__file-type" aria-hidden="true"><FileTypeIcon size={18} /></span>
                <div className="upload-item__details">
                  <div className="upload-item__name-group">
                    <strong className="upload-item__name" title={record.originalFilename}>{record.originalFilename}</strong>
                    <time className="upload-item__meta" dateTime={record.createdAt}>{new Date(record.createdAt).toLocaleString(language)}</time>
                  </div>
                </div>
                <div className="upload-item__controls">
                  <Button type="button" variant="ghost" className="upload-item__action" aria-label={t("Download again: {filename}", { filename: record.originalFilename })} title={t("Download again: {filename}", { filename: record.originalFilename })} onClick={() => {
                    try {
                      enqueueDownloads([{ id: record.mediaId, originalFilename: record.originalFilename, fileSizeBytes: 0 }]);
                    } catch (error) {
                      showToast.error(t("Could not start this download."), error instanceof Error ? error.message : undefined);
                    }
                  }}><RotateCcw size={18} aria-hidden="true" /></Button>
                </div>
              </section>
            );
          })}
        </div>
        {records.length > 5 ? <Pagination page={page} pageSize={5} total={records.length} onPageChange={setPage} itemLabel="files" /> : null}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
