import { useState } from "react";
import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";
import { Progress } from "@animate-ui/react/primitives/base-ui/progress";
import { motionTokens } from "@animate-ui/react/utils/motion";
import { Button } from "../../../components/ui/Button";
import { Pagination } from "../../../components/ui/Pagination";
import { ConfirmationDialog } from "../../../components/ui/ConfirmationDialog";
import { Trash2 } from "../../../components/animate-ui/icons/trash-2";
import { Pause } from "../../../components/animate-ui/icons/pause";
import { Play } from "../../../components/animate-ui/icons/play";
import { Image } from "../../../components/animate-ui/icons/image";
import { Video } from "../../../components/animate-ui/icons/video";
import { FileText } from "../../../components/animate-ui/icons/file-text";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { useLocale } from "../../../context/LocaleContext";
import { useAuthStore } from "../../../store/authStore";
import { useUploadNotificationStore } from "../../notifications/uploadNotificationStore";
import { uploadCategory, useUploadReadStore } from "../hooks/useUnreadUploads";
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
  avatarUser?: { id: string; username?: string; avatarSeed?: string | null };
  busyItemIds: ReadonlySet<string>;
  onDelete?: (batch: UploadBatch, item?: UploadItem) => void | Promise<void>;
  onDeleteMany?: (batch: UploadBatch, items: UploadItem[]) => Promise<void>;
  onPause?: (batch: UploadBatch, item: UploadItem | undefined, paused: boolean) => void;
}

export function UploadBatchCard({
  batch,
  showUsername,
  avatarUser,
  busyItemIds,
  onDelete,
  onDeleteMany,
  onPause,
}: UploadBatchCardProps) {
  const { t, language } = useLocale();
  const userId = useAuthStore((state) => state.user?.id) ?? "";
  const read = useUploadReadStore((state) => state.read);
  const markBatchSeenLocally = useUploadReadStore((state) => state.markBatchRead);
  const unreadItems = batch.viewedAt ? [] : batch.items.filter((item) => { const category = uploadCategory(item); return category && read[`${userId}:${item.id}`] !== category; });
  const markBatchRead = () => {
    if (!unreadItems.length) return;
    markBatchSeenLocally(userId, batch.id, unreadItems);
    useUploadNotificationStore.getState().markRead(userId, `upload:${userId}:${batch.id}`);
  };
  const active = batch.status === "Uploading" || batch.status === "Pending";
  const [expanded, setExpanded] = useState(active);
  const [itemPage, setItemPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedItems = batch.items.filter((item) => selectedIds.has(item.id));
  const actionItems = selectedItems.length ? selectedItems : batch.items;
  const [deleteTarget, setDeleteTarget] = useState<{ item?: UploadItem; selected?: UploadItem[] } | null>(null);
  const filteredItems = batch.items;
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
      <div
        className={`upload-batch__summary${showUsername ? " upload-batch__summary--admin" : ""}${unreadItems.length ? " upload-batch__summary--unread" : ""}`}
        onMouseEnter={markBatchRead}
        onFocus={markBatchRead}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button, input, a, select, [role='combobox']")) return;
          setExpanded((current) => !current);
        }}
      >
        <Collapsible.Trigger
          type="button"
          className="upload-batch__toggle"
          aria-label={toggleLabel}
          title={toggleLabel}
          aria-controls={panelId}
        >
          <span className="upload-batch__toggle-label">{toggleLabel}</span>
        </Collapsible.Trigger>
        {batch.canManage ? <input className="upload-item__select upload-batch__select-all" type="checkbox" aria-label={t("Select all files")} title={t("Select all files")} disabled={filteredItems.length === 0} checked={filteredItems.length > 0 && selectedItems.length === filteredItems.length} ref={(element) => { if (element) element.indeterminate = selectedItems.length > 0 && selectedItems.length < filteredItems.length; }} onChange={(event) => setSelectedIds(event.target.checked ? new Set(filteredItems.map((item) => item.id)) : new Set())} /> : null}
        {showUsername ? <UserAvatar user={avatarUser ?? { id: batch.username ?? batch.id, username: batch.username ?? undefined }} className="upload-batch__owner-avatar" /> : null}
        {showUsername ? (
          <div className="upload-batch__field upload-batch__username-field">
            <span className="upload-batch__label">{t("Username")}</span>
            <span className="upload-batch__value">{batch.username ?? avatarUser?.username ?? "—"}</span>
          </div>
        ) : null}
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
          <span className={`upload-status upload-status--${batch.status.toLowerCase()}`} aria-label={t(batchStatusLabels[batch.status])}>
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
          </div>
        </div>
        {batch.canManage ? (
          <div className="upload-batch__footer">
            {onPause ? <Button type="button" variant="ghost" className="upload-item__action" aria-label={t(!batch.items.some((item) => item.status === "Pending" || item.status === "Uploading") && batch.items.some((item) => item.status === "Paused") ? "Resume batch" : "Pause batch")} title={t(!batch.items.some((item) => item.status === "Pending" || item.status === "Uploading") && batch.items.some((item) => item.status === "Paused") ? "Resume batch" : "Pause batch")} disabled={!batch.items.some((item) => item.status === "Pending" || item.status === "Uploading" || item.status === "Paused") || batch.items.some((item) => busyItemIds.has(item.id))} onClick={() => onPause(batch, undefined, batch.items.some((item) => item.status === "Pending" || item.status === "Uploading"))}>{!batch.items.some((item) => item.status === "Pending" || item.status === "Uploading") && batch.items.some((item) => item.status === "Paused") ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}</Button> : null}
            {onDelete ? <Button type="button" variant="ghost" className="upload-item__action upload-item__action--delete btn--danger-solid" aria-label={t("Delete batch record")} title={t("Delete batch record")} disabled={deleteTarget !== null || (selectedItems.length > 0 && !onDeleteMany) || actionItems.some((item) => busyItemIds.has(item.id) || (selectedItems.length > 0 && item.status === "Success"))} onClick={() => setDeleteTarget({ selected: selectedItems.length ? [...selectedItems] : undefined })}><Trash2 size={18} aria-hidden="true" /></Button> : null}

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
              <section key={item.id} className={`upload-item${batch.canManage ? " upload-item--selectable" : ""}${showUsername ? " upload-item--admin" : ""}`} aria-label={item.originalFilename} onClick={(event) => {
                if (!batch.canManage || (event.target as HTMLElement).closest("button, input, a, select")) return;
                setSelectedIds((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; });
              }}>
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
                        <span className="upload-item__meta-type">{item.contentType}</span>
                        <span>{formatBytes(item.fileSizeBytes)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="upload-item__date upload-batch__field">
                  <span className="upload-batch__label upload-batch__date-label">{t("Date & Time")}</span>
                  <span className="upload-batch__label upload-batch__date-label-mobile">{t("Date")}</span>
                  {item.completedAt ? <time className="upload-batch__value" dateTime={item.completedAt}><span className="upload-batch__date-time">{new Date(item.completedAt).toLocaleString(language)}</span><span className="upload-batch__date-only">{new Date(item.completedAt).toLocaleDateString(language)}</span></time> : <span className="upload-batch__value">?</span>}
                </div>
                <div className="upload-item__status-field upload-batch__field">
                  <span className="upload-batch__label">{t("Status")}</span>
                  <span className={`upload-status upload-status--${item.status.toLowerCase()}`} aria-label={t(itemStatusLabels[item.status])}>{t(itemStatusLabels[item.status])}</span>
                </div>
                <div className="upload-item__controls">
                  <div className="upload-item__actions">
                    {batch.canManage ? <>
                      {onPause ? <Button type="button" variant="ghost" className="upload-item__action" aria-label={t(item.status === "Paused" ? "Resume {name}" : "Pause {name}", { name: item.originalFilename })} title={t(item.status === "Paused" ? "Resume {name}" : "Pause {name}", { name: item.originalFilename })} disabled={busy || !["Pending", "Uploading", "Paused"].includes(item.status)} onClick={() => onPause(batch, item, item.status !== "Paused")}>{item.status === "Paused" ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}</Button> : null}
                      {onDelete ? <Button type="button" variant="ghost" className="upload-item__action upload-item__action--delete btn--danger-solid" aria-label={t("Delete record: {filename}", { filename: item.originalFilename })} title={t("Delete record: {filename}", { filename: item.originalFilename })} disabled={deleteTarget !== null || busy || item.status === "Success"} onClick={() => setDeleteTarget({ item })}><Trash2 size={18} aria-hidden="true" /></Button> : null}
                    </> : null}
                  </div>
                </div>
                <div className="upload-item__progress-row upload-batch__field">
                  <span className="upload-batch__label">{t("Progress")}</span>
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
        <ConfirmationDialog
          title="Delete record"
          confirmLabel={deleteTarget.item ? "Delete record" : deleteTarget.selected ? "Delete selected records" : "Delete batch record"}
          danger
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (deleteTarget.selected) {
              if (!onDeleteMany) throw new Error(t("Could not delete upload record."));
              await onDeleteMany(batch, deleteTarget.selected);
              setSelectedIds(new Set());
            } else {
              if (!onDelete) throw new Error(t("Could not delete upload record."));
              await onDelete(batch, deleteTarget.item);
            }
          }}
        >
          <p>{deleteTarget.item
            ? t("Delete the record for {filename}?", { filename: deleteTarget.item.originalFilename })
            : t("Delete {count} file records from the batch created on {date}?", {
              count: deleteTarget.selected?.length ?? batch.items.length,
              date: new Date(batch.createdAt).toLocaleString(language),
            })}</p>
          <p>{t("These records cannot be restored. Pending uploads will stop. Media already in your gallery will stay there.")}</p>
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

export function formatCompactDate(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}
