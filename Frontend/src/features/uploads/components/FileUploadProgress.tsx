import { useId, useState } from "react";
import { ChevronDown, CircleAlert, CircleCheck, CircleX, Clock, LoaderCircle, RotateCcw, Trash2, Upload } from "lucide-react";
import { Progress } from "@animate-ui/react/primitives/base-ui/progress";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/context/LocaleContext";
import type { TransferProgress, TransferStatus } from "../uploadProgress";
import "./file-upload-progress.css";

const statuses = {
  queued: { label: "Pending upload", Icon: Clock },
  uploading: { label: "Uploading", Icon: Upload },
  processing: { label: "Processing upload", Icon: LoaderCircle },
  success: { label: "Success", Icon: CircleCheck },
  failed: { label: "Failed", Icon: CircleAlert },
  cancelled: { label: "Cancelled", Icon: CircleX },
} satisfies Record<TransferStatus, { label: string; Icon: typeof Clock }>;

export function FileUploadProgress({ name, progress, compact, createdAt, onCancel, onRetry, onDismiss, onDelete }: {
  name: string;
  progress: TransferProgress;
  compact?: boolean;
  createdAt?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
  onDelete?: () => void;
}) {
  const { t, language } = useLocale();
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  const { label, Icon } = statuses[progress.status];
  const percent = progress.total > 0 ? Math.floor(progress.loaded / progress.total * 100) : 0;
  const remaining = progress.remaining === undefined ? undefined : Math.max(1, Math.ceil(progress.remaining));
  const action = progress.status === "failed" ? { label: "Retry", run: onRetry }
    : progress.status === "cancelled" ? { label: "Restart", run: onRetry }
    : progress.status === "success" ? { label: "Dismiss", run: onDismiss }
    : { label: "Cancel", run: onCancel };
  const format = (bytes: number) => formatBytes(bytes, language);
  const size = `${format(progress.loaded)} / ${format(progress.total)}`;
  const speed = progress.status === "uploading" && progress.speed ? t("{size}/s", { size: format(progress.speed) }) : "";
  const eta = remaining && progress.status === "uploading" ? (remaining < 60
    ? t("{count} s left", { count: remaining })
    : t("{count} min left", { count: Math.ceil(remaining / 60) })) : "";
  const date = createdAt ? new Date(createdAt).toLocaleString(language, { dateStyle: "medium", timeStyle: "short" }) : "";
  const tooltip = [t(label), `${percent}%`, size, speed, eta, date, progress.error && t(progress.error)].filter(Boolean).join(" · ");
  const ActionIcon = action.label === "Cancel" ? CircleX : RotateCcw;
  const transferring = progress.status === "uploading" || progress.status === "processing";
  const status = (
    <span className="file-upload-progress__status" role="status">
      <Icon size={16} aria-hidden="true" /><span>{t(label)}</span>
    </span>
  );
  const bar = (
    <Progress.Root className="file-upload-progress__bar" value={percent} aria-label={t("Progress for {name}", { name })} aria-valuetext={tooltip}>
      <Progress.Track className="file-upload-progress__track">
        <Progress.Indicator className="file-upload-progress__indicator" />
      </Progress.Track>
    </Progress.Root>
  );
  const actions = (
    <div className="file-upload-progress__actions">
      {action.run && <Button type="button" variant="ghost" className="file-upload-progress__action"
        aria-label={t("{action} {name}", { action: t(action.label), name })} title={t(action.label)}
        onClick={action.run}>{compact ? <ActionIcon size={18} aria-hidden="true" /> : t(action.label)}</Button>}
      {onDelete && <Button type="button" variant="ghost" className="file-upload-progress__action"
        aria-label={t("Delete record: {filename}", { filename: name })} title={t("Delete record")}
        onClick={onDelete}><Trash2 size={18} aria-hidden="true" /></Button>}
    </div>
  );
  const error = progress.error && <p className="file-upload-progress__error" role="status">{t(progress.error)}</p>;
  if (compact) {
    return (
      <div className="file-upload-progress file-upload-progress--compact" role="listitem" data-status={progress.status}>
        <div className="file-upload-progress__summary">
          <button type="button" className="file-upload-progress__details-toggle" aria-expanded={expanded}
            aria-controls={detailsId} onClick={() => setExpanded((open) => !open)} title={name}>
            <strong className="file-upload-progress__name">{name}</strong>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          <div className="file-upload-progress__history-meta">
            <span>{transferring ? size : format(progress.total)}</span>
            {date && <time dateTime={createdAt}>{date}</time>}
          </div>
          {status}
          {transferring && <span className="file-upload-progress__percentage">{percent}%</span>}
          {actions}
        </div>
        {transferring && <>
          {bar}
          {(speed || eta) && <div className="file-upload-progress__rate"><span>{speed}</span><span>{eta}</span></div>}
        </>}
        {error}
        <div className="file-upload-progress__details" id={detailsId} hidden={!expanded}>
          <span>{name}</span>
          <div className="file-upload-progress__detail-meta">
            <span>{percent}% · {size}</span>
            {date && <time dateTime={createdAt}>{date}</time>}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="file-upload-progress" data-status={progress.status}>
      <div className="file-upload-progress__header">
        <strong className="file-upload-progress__name" title={name}>{name}</strong>
        {status}
      </div>
      {bar}
      <div className="file-upload-progress__footer">
        <div className="file-upload-progress__metrics">
          <span>{percent}%</span>
          <span>{size}</span>
          <span>{speed}</span>
          <span>{eta}</span>
        </div>
        {actions}
      </div>
      {error}
    </div>
  );
}

export function formatBytes(bytes: number, language?: string): string {
  if (bytes < 1024) return `${Math.floor(bytes)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toLocaleString(language, { maximumFractionDigits: value >= 10 ? 0 : 1 })} ${units[unitIndex]}`;
}
