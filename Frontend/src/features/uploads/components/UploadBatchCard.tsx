import { useState } from "react";
import { motion } from "motion/react";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";
import { Progress } from "@animate-ui/react/primitives/base-ui/progress";
import { motionTokens, useShouldReduceMotion, useTempoTransition } from "@animate-ui/react/utils/motion";
import { Button } from "../../../components/ui/Button";
import { Pagination } from "../../../components/ui/Pagination";
import { BatchItemFilters, batchFileType } from "./BatchItemFilters";
import { ConfirmationDialog } from "../../../components/ui/ConfirmationDialog";
import { RotateCcw } from "../../../components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "../../../components/animate-ui/icons/trash-2";
import { Pause } from "../../../components/animate-ui/icons/pause";
import { Play } from "../../../components/animate-ui/icons/play";
import { ChevronDown } from "../../../components/animate-ui/icons/chevron-down";
import { Image } from "../../../components/animate-ui/icons/image";
import { Video } from "../../../components/animate-ui/icons/video";
import { FileText } from "../../../components/animate-ui/icons/file-text";
import { useLocale } from "../../../context/LocaleContext";
import type { UploadBatch, UploadBatchStatus, UploadItem, UploadItemStatus } from "../types";

const ITEMS_PER_PAGE = 5;

const batchStatusLabels: Record<UploadBatchStatus, string> = {
  Pending: "Pending upload",
  Uploading: "Uploading",
  Cancelled: "Cancelled",
  Failed: "Failed",
  Completed: "Completed",
  Paused: "Paused",
};

const itemStatusLabels: Record<UploadItemStatus, string> = {
  Pending: "Pending upload",
  Uploading: "Uploading",
  Success: "Success",
  Failed: "Failed",
  Cancelled: "Cancelled",
  Paused: "Paused",
};

interface UploadBatchCardProps {
  batch: UploadBatch;
  displayId?: number;
  showUsername: boolean;
  busyItemIds: ReadonlySet<string>;
  onRetry: (batch: UploadBatch, item: UploadItem) => void;
  onRetryAll?: (batch: UploadBatch) => void;
  onDelete?: (batch: UploadBatch, item?: UploadItem) => void | Promise<void>;
  onDeleteMany?: (batch: UploadBatch, items: UploadItem[]) => Promise<void>;
  onPause?: (batch: UploadBatch, item: UploadItem | undefined, paused: boolean) => void;
}

export function UploadBatchCard({
  batch,
  displayId,
  showUsername,
  busyItemIds,
  onRetry,
  onRetryAll,
  onDelete,
  onDeleteMany,
  onPause,
}: UploadBatchCardProps) {
  const { t } = useLocale();
  const shouldReduceMotion = useShouldReduceMotion();
  const chevronTransition = useTempoTransition(motionTokens.transition.reveal);
  const active = batch.status === "Uploading" || batch.status === "Pending";
  const [expanded, setExpanded] = useState(active);
  const [itemPage, setItemPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedItems = batch.items.filter((item) => selectedIds.has(item.id));
  const actionItems = selectedItems.length ? selectedItems : batch.items;
  const [deleteTarget, setDeleteTarget] = useState<UploadItem | "batch" | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const filteredItems = batch.items.filter((item) => (!statusFilter || item.status === statusFilter) && (!typeFilter || batchFileType(item.originalFilename, item.contentType) === typeFilter));
  const totalItemPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const currentItemPage = Math.min(itemPage, totalItemPages);
  const visibleItems = filteredItems.slice(
    (currentItemPage - 1) * ITEMS_PER_PAGE,
    currentItemPage * ITEMS_PER_PAGE,
  );
  const panelId = `upload-batch-${batch.id}`;
  const progress = batch.totalFiles > 0
    ? Math.max(0, Math.min((batch.successfulFiles / batch.totalFiles) * 100, 100))
    : 0;
  const toggleLabel = active
    ? (expanded ? t("Hide files") : t("View files"))
    : (expanded ? t("Hide history") : t("View history"));

  return (
    <Collapsible.Root
      render={<article />}
      className="upload-batch"
      open={expanded}
      onOpenChange={setExpanded}
    >
      <div className={`upload-batch__summary${showUsername ? " upload-batch__summary--admin" : ""}`}>
        <Collapsible.Trigger
          type="button"
          className="upload-batch__toggle"
          aria-label={toggleLabel}
          title={toggleLabel}
          aria-controls={panelId}
        >
          <motion.span
            className="upload-batch__chevron"
            aria-hidden="true"
            initial={false}
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : chevronTransition}
          >
            <ChevronDown size={18} aria-hidden="true" />
          </motion.span>
        </Collapsible.Trigger>
        {displayId !== undefined ? (
          <div className="upload-batch__field upload-batch__ordinal-field">
            <span className="upload-batch__label">{t("ID")}</span>
            <span className="upload-batch__value">{displayId}</span>
          </div>
        ) : null}
        {showUsername ? (
          <div className="upload-batch__field upload-batch__username-field">
            <span className="upload-batch__label">{t("Username")}</span>
            <span className="upload-batch__value">{batch.username ?? "—"}</span>
          </div>
        ) : null}
        <div className="upload-batch__field upload-batch__created-field">
          <span className="upload-batch__label">{t("Created")}</span>
          <time className="upload-batch__value" dateTime={batch.createdAt}>
            {new Date(batch.createdAt).toLocaleDateString()}
          </time>
        </div>
        <div className="upload-batch__field upload-batch__status-field">
          <span className="upload-batch__label">{t("Status")}</span>
          <span className={`upload-status upload-status--${batch.status.toLowerCase()}`}>
            {t(batchStatusLabels[batch.status])}
          </span>
        </div>
        <div className="upload-batch__field upload-batch__progress-field">
          <span className="upload-batch__label">{t("Batch progress")}</span>
          <div className="upload-progress__line">
            <Progress.Root
              value={progress}
              aria-label={t("Batch progress")}
              aria-valuetext={`${batch.successfulFiles}/${batch.totalFiles}`}
              className="upload-progress"
            >
              <Progress.Track className="upload-progress__track">
                <Progress.Indicator className="upload-progress__indicator" />
              </Progress.Track>
            </Progress.Root>
            <span className="upload-progress__value">
              {batch.successfulFiles}/{batch.totalFiles}
            </span>
          </div>
        </div>
        <BatchItemFilters statuses={[...new Set(batch.items.map((item) => item.status))]} types={[...new Set(batch.items.map((item) => batchFileType(item.originalFilename, item.contentType)))]} status={statusFilter} type={typeFilter} onStatusChange={(value) => { setStatusFilter(value); setItemPage(1); }} onTypeChange={(value) => { setTypeFilter(value); setItemPage(1); }} />
        {batch.canManage ? (
          <div className="upload-batch__footer">
            <input className="upload-item__select upload-batch__select-all" type="checkbox" aria-label={t("Select all files")} title={t("Select all files")} checked={batch.items.length > 0 && selectedItems.length === batch.items.length} ref={(element) => { if (element) element.indeterminate = selectedItems.length > 0 && selectedItems.length < batch.items.length; }} onChange={(event) => setSelectedIds(event.target.checked ? new Set(batch.items.map((item) => item.id)) : new Set())} />
            {onRetryAll ? (
            <Button type="button" variant="ghost" className="upload-item__action" aria-label={t("Retry all failed")} title={t("Retry all failed")} disabled={actionItems.filter((item) => item.status === "Failed").length < 1 || actionItems.filter((item) => item.status === "Failed").every((item) => busyItemIds.has(item.id))} onClick={() => onRetryAll({ ...batch, items: actionItems })}>
              <RotateCcw size={18} aria-hidden="true" />
            </Button>
            ) : null}
            {onPause ? <Button type="button" variant="ghost" className="upload-item__action" aria-label={t(!batch.items.some((item) => item.status === "Pending" || item.status === "Uploading") && batch.items.some((item) => item.status === "Paused") ? "Resume batch" : "Pause batch")} title={t(!batch.items.some((item) => item.status === "Pending" || item.status === "Uploading") && batch.items.some((item) => item.status === "Paused") ? "Resume batch" : "Pause batch")} disabled={!batch.items.some((item) => item.status === "Pending" || item.status === "Uploading" || item.status === "Paused") || batch.items.some((item) => busyItemIds.has(item.id))} onClick={() => onPause(batch, undefined, batch.items.some((item) => item.status === "Pending" || item.status === "Uploading"))}>{!batch.items.some((item) => item.status === "Pending" || item.status === "Uploading") && batch.items.some((item) => item.status === "Paused") ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}</Button> : null}
            {onDelete ? <Button type="button" variant="ghost" className="upload-item__action upload-item__action--delete" aria-label={t("Delete batch record")} title={t("Delete batch record")} disabled={actionItems.some((item) => item.status === "Success" || busyItemIds.has(item.id))} onClick={() => setDeleteTarget("batch")}><Trash2 size={18} aria-hidden="true" /></Button> : null}

          </div>
        ) : null}
      </div>

      <Collapsible.Panel
        id={panelId}
        className="upload-batch__panel"
        keepMounted
        transition={motionTokens.transition.reveal}
      >
        <div className="upload-batch__items">
          {visibleItems.length === 0 ? <p className="upload-batch__empty">{t("No files match these filters.")}</p> : null}
          {visibleItems.map((item) => {
            const busy = busyItemIds.has(item.id);
            const indeterminate = item.status === "Uploading" && item.progressPercent === 0;
            const itemProgress = item.status === "Success" ? 100 : Math.min(item.progressPercent, 99);
            const FileTypeIcon = item.contentType.startsWith("image/")
              ? Image
              : item.contentType.startsWith("video/")
                ? Video
                : FileText;
            return (
              <section key={item.id} className="upload-item" aria-label={item.originalFilename}>
                {batch.canManage ? <input className="upload-item__select" type="checkbox" aria-label={t("Select {name}", { name: item.originalFilename })} checked={selectedIds.has(item.id)} onChange={(event) => setSelectedIds((current) => { const next = new Set(current); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next; })} /> : null}
                <span className="upload-item__file-type" aria-hidden="true">
                  <FileTypeIcon size={18} />
                </span>
                <div className="upload-item__details">
                  <div className="upload-item__name-group">
                    <strong className="upload-item__name" title={item.originalFilename}>
                      {item.originalFilename}
                    </strong>
                    <div className="upload-item__meta-row">
                      <span className="upload-item__meta">
                        {item.contentType} · {formatBytes(item.fileSizeBytes)}
                      </span>
                      <span className={`upload-status upload-status--${item.status.toLowerCase()} upload-item__status`}>
                        {t(itemStatusLabels[item.status])}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="upload-item__controls">
                  <div className="upload-item__actions">
                    {batch.canManage ? <>
                      <Button type="button" variant="ghost" className="upload-item__action" busy={busy && item.status === "Failed"} disabled={busy || item.status !== "Failed"} aria-label={t("Retry {name}", { name: item.originalFilename })} title={t("Retry")} onClick={() => onRetry(batch, item)}><RotateCcw size={18} aria-hidden="true" /></Button>
                      {onPause ? <Button type="button" variant="ghost" className="upload-item__action" aria-label={t(item.status === "Paused" ? "Resume {name}" : "Pause {name}", { name: item.originalFilename })} title={t(item.status === "Paused" ? "Resume {name}" : "Pause {name}", { name: item.originalFilename })} disabled={busy || !["Pending", "Uploading", "Paused"].includes(item.status)} onClick={() => onPause(batch, item, item.status !== "Paused")}>{item.status === "Paused" ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}</Button> : null}
                      {onDelete ? <Button type="button" variant="ghost" className="upload-item__action upload-item__action--delete" aria-label={t("Delete record: {filename}", { filename: item.originalFilename })} title={t("Delete record: {filename}", { filename: item.originalFilename })} disabled={busy || item.status === "Success"} onClick={() => setDeleteTarget(item)}><Trash2 size={18} aria-hidden="true" /></Button> : null}
                    </> : null}
                  </div>
                </div>
                <div className="upload-item__progress-row">
                  <Progress.Root
                    value={indeterminate ? null : itemProgress}
                    aria-label={t("Progress for {name}", { name: item.originalFilename })}
                    aria-valuetext={indeterminate ? t("Starting") : `${itemProgress}%`}
                    className="upload-progress"
                  >
                    <Progress.Track className="upload-progress__track">
                      <Progress.Indicator className="upload-progress__indicator" />
                    </Progress.Track>
                  </Progress.Root>
                </div>
                {item.errorDetails ? (
                  <p className="upload-item__error" role="status">{item.errorDetails}</p>
                ) : null}
                {item.retryCount > 0 ? (
                  <span className="upload-item__retry-count">
                    {t("Retries: {count}", { count: item.retryCount })}
                  </span>
                ) : null}
              </section>
            );
          })}
        </div>
        {filteredItems.length > ITEMS_PER_PAGE ? (
          <Pagination
            page={currentItemPage}
            pageSize={ITEMS_PER_PAGE}
            total={filteredItems.length}
            itemLabel="Files"
            onPageChange={setItemPage}
          />
        ) : null}
      </Collapsible.Panel>
      {deleteTarget ? (
        <ConfirmationDialog title="Delete record" danger onClose={() => setDeleteTarget(null)} onConfirm={async () => { if (deleteTarget === "batch" && selectedItems.length) { await onDeleteMany?.(batch, selectedItems); setSelectedIds(new Set()); } else await onDelete?.(batch, deleteTarget === "batch" ? undefined : deleteTarget); }}>
          {deleteTarget === "batch" ? t(selectedItems.length ? "Delete the selected file records?" : "Delete this batch record and its file records?") : t("Delete the record for {filename}?", { filename: deleteTarget.originalFilename })}
        </ConfirmationDialog>
      ) : null}
    </Collapsible.Root>
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
