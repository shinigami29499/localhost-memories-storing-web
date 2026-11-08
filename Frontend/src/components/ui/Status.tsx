import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { useLocale } from "../../context/LocaleContext";
import type { ReactNode } from "react";
import { SwappingText } from "@animate-ui/react/primitives/texts/swapping";
import { useAnimationStore } from "../../store/animationStore";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  const { t } = useLocale();
  return (
    <div className="spinner" role="status" aria-live="polite">
      <LoaderCircle className="spinner__wheel" aria-hidden="true" />
      <span>{t(label)}</span>
    </div>
  );
}

export function EmptyState({ title, hint, action, animateText = false }: { title: string; hint?: string; action?: ReactNode; animateText?: boolean }) {
  const { t } = useLocale();
  const enabled = useAnimationStore((state) => state.enabled);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const swap = animateText && enabled && !reduced;
  return (
    <div className="empty-state">
      <p className="empty-state__title">{swap ? <><span aria-hidden="true"><SwappingText text={t(title)} stagger={0.025} /></span><span className="sr-only">{t(title)}</span></> : t(title)}</p>
      {hint ? <p className="empty-state__hint">{swap ? <><span aria-hidden="true"><SwappingText text={t(hint)} stagger={0.025} /></span><span className="sr-only">{t(hint)}</span></> : t(hint)}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
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
