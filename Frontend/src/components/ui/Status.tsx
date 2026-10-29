import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { useLocale } from "../../context/LocaleContext";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  const { t } = useLocale();
  return (
    <div className="spinner" role="status" aria-live="polite">
      <LoaderCircle className="spinner__wheel" aria-hidden="true" />
      <span>{t(label)}</span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const { t } = useLocale();
  return (
    <div className="empty-state">
      <p className="empty-state__title">{t(title)}</p>
      {hint ? <p className="empty-state__hint">{t(hint)}</p> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLocale();
  return (
    <div className="error-state">
      <p className="error-state__message" role="alert">{t(message)}</p>
      {onRetry ? (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          {t("Try again")}
        </button>
      ) : null}
    </div>
  );
}
