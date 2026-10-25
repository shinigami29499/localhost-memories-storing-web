import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <LoaderCircle className="spinner__wheel" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {hint ? <p className="empty-state__hint">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button className="btn btn--secondary" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
