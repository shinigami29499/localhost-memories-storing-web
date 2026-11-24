import { useLocale } from "@/context/LocaleContext";
import { useMapLoadingState } from "@/features/locations/components/useMapLoadingState";
import "./mobile-map-controls.css";
import { PageDataPlaceholder } from "@/components/ui/PageDataPlaceholder";

export function MobileMapLoadingOverlay({ ready, className }: { ready: boolean; className: string }) {
  const { t } = useLocale();
  const { exiting, setFinished, hidden } = useMapLoadingState(ready);
  if (hidden) return null;
  return <div className={className} aria-hidden={ready || undefined} data-ready={ready || undefined} data-exiting={exiting || undefined} onAnimationEnd={(event) => {
    if (event.target === event.currentTarget && exiting) setFinished(true);
  }}><PageDataPlaceholder layout="map" label={t("Loading map...")} showImmediately /></div>;
}
