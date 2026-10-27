import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";
import { Progress } from "@animate-ui/react/primitives/base-ui/progress";
import { motionTokens, useShouldReduceMotion, useTempoTransition } from "@animate-ui/react/utils/motion";
import { Button } from "../../../components/ui/Button";
import { Pagination } from "../../../components/ui/Pagination";
import { RotateCcw } from "../../../components/animate-ui/icons/rotate-ccw";
import { X } from "../../../components/animate-ui/icons/x";
import { ChevronDown } from "../../../components/animate-ui/icons/chevron-down";
import { ArrowRight } from "../../../components/animate-ui/icons/arrow-right";
import { useLocale } from "../../../context/LocaleContext";
import type { UploadBatch, UploadBatchStatus, UploadItem } from "../types";

const ITEMS_PER_PAGE = 5;

const statusLabels: Record<UploadBatchStatus, string> = {
  Pending: "Pending upload",
  Uploading: "Uploading",
  Success: "Success",
  Failed: "Failed",
  Cancelled: "Cancelled",
  PartialFailure: "Partial failure",
};

interface UploadBatchCardProps {
  batch: UploadBatch;
  showUsername: boolean;
  busyItemIds: ReadonlySet<string>;
  onRetry: (batch: UploadBatch, item: UploadItem) => void;
  onCancel: (batch: UploadBatch, item: UploadItem) => void;
}

export function UploadBatchCard({
  batch,
  showUsername,
  busyItemIds,
  onRetry,
  onCancel,
}: UploadBatchCardProps) {
  const { t } = useLocale();
  const shouldReduceMotion = useShouldReduceMotion();
  const chevronTransition = useTempoTransition(motionTokens.transition.reveal);
  const active = batch.status === "Uploading" || batch.status === "Pending";
  const [expanded, setExpanded] = useState(active);
  const [itemPage, setItemPage] = useState(1);
  const totalItemPages = Math.max(1, Math.ceil(batch.items.length / ITEMS_PER_PAGE));
  const currentItemPage = Math.min(itemPage, totalItemPages);
  const visibleItems = batch.items.slice(
    (currentItemPage - 1) * ITEMS_PER_PAGE,
    currentItemPage * ITEMS_PER_PAGE,
  );
  const panelId = `upload-batch-${batch.id}`;
  const progress = batch.status === "Success" ? 100 : Math.min(batch.progressPercent, 99);
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
        <div className="upload-batch__field upload-batch__identity">
          <span className="upload-batch__label">{t("Batch")}</span>
          <span className="upload-batch__id">{batch.id}</span>
          {batch.caption ? <span className="upload-batch__value">{batch.caption}</span> : null}
        </div>
        {showUsername ? (
          <div className="upload-batch__field">
            <span className="upload-batch__label">{t("Username")}</span>
            <span className="upload-batch__value">{batch.username ?? "—"}</span>
          </div>
        ) : null}
        <div className="upload-batch__field">
          <span className="upload-batch__label">{t("Created")}</span>
          <time className="upload-batch__value" dateTime={batch.createdAt}>
            {new Date(batch.createdAt).toLocaleString()}
          </time>
        </div>
        <div className="upload-batch__field">
          <span className="upload-batch__label">{t("Files")}</span>
          <span className="upload-batch__value">{batch.successfulFiles}/{batch.totalFiles}</span>
        </div>
        <div className="upload-batch__field upload-batch__status-field">
          <span className="upload-batch__label">{t("Status")}</span>
          <span className={`upload-status upload-status--${batch.status.toLowerCase()}`}>
            {t(statusLabels[batch.status])}
          </span>
        </div>
        <div className="upload-batch__field upload-batch__progress-field">
          <span className="upload-batch__label">{t("Batch progress")}</span>
          <div className="upload-progress__line">
            <Progress.Root
              value={progress}
              aria-label={t("Batch progress")}
              aria-valuetext={`${progress}%`}
              className="upload-progress"
            >
              <Progress.Track className="upload-progress__track">
                <Progress.Indicator className="upload-progress__indicator" />
              </Progress.Track>
            </Progress.Root>
            <span className="upload-progress__value">{progress}%</span>
          </div>
        </div>
        <div className="upload-batch__footer">
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
          {batch.postId ? (
            <Link to={`/posts/${batch.postId}`} className="btn btn--secondary upload-batch__post-link">
              {t("View post")}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
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
            return (
              <section key={item.id} className="upload-item" aria-label={item.originalFilename}>
                <div className="upload-item__details">
                  <div className="upload-item__name-group">
                    <strong className="upload-item__name" title={item.originalFilename}>
                      {item.originalFilename}
                    </strong>
                    <span className="upload-item__meta">
                      {item.contentType} · {formatBytes(item.fileSizeBytes)}
                    </span>
                  </div>
                  <span className={`upload-status upload-status--${item.status.toLowerCase()}`}>
                    {t(statusLabels[item.status])}
                  </span>
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
                  <span className="upload-progress__value">
                    {indeterminate ? t("Starting") : `${itemProgress}%`}
                  </span>
                  <div className="upload-item__actions">
                    {item.status === "Failed" && batch.canManage ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="upload-item__action"
                        busy={busy}
                        disabled={busy}
                        aria-label={t("Retry {name}", { name: item.originalFilename })}
                        title={t("Retry")}
                        onClick={() => onRetry(batch, item)}
                      >
                        {busy ? null : <RotateCcw size={18} aria-hidden="true" />}
                      </Button>
                    ) : null}
                    {(item.status === "Pending" || item.status === "Uploading") && batch.canManage ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="upload-item__action upload-item__action--cancel"
                        busy={busy}
                        disabled={busy}
                        aria-label={t("Cancel {name}", { name: item.originalFilename })}
                        title={t("Cancel")}
                        onClick={() => onCancel(batch, item)}
                      >
                        {busy ? null : <X size={18} aria-hidden="true" />}
                      </Button>
                    ) : null}
                  </div>
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
        {batch.items.length > ITEMS_PER_PAGE ? (
          <Pagination
            page={currentItemPage}
            pageSize={ITEMS_PER_PAGE}
            total={batch.items.length}
            itemLabel="Files"
            onPageChange={setItemPage}
          />
        ) : null}
      </Collapsible.Panel>
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
