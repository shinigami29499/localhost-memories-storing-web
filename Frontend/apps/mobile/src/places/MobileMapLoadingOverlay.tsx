import { useLocale } from "@/context/LocaleContext";
import { useMapLoadingState } from "@/features/locations/components/useMapLoadingState";
import { PageDataPlaceholder } from "@/components/ui/PageDataPlaceholder";

export function MobileMapLoadingOverlay({ ready, className, closeDelay = 0 }: { ready: boolean; className: string; closeDelay?: number }) {
  const { t } = useLocale();
  const { exiting, setFinished, hidden } = useMapLoadingState(ready, closeDelay);
  if (hidden) return null;
  return <div className={className} aria-hidden={ready || undefined} data-exiting={exiting || undefined} onAnimationEnd={(event) => {
    if (event.target === event.currentTarget && exiting) setFinished(true);
  }}><PageDataPlaceholder layout="map" label={t("Loading map...")} /></div>;
}
