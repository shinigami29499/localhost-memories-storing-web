import { Spinner } from "../../../components/ui";
import { useMapLoadingState } from "./useMapLoadingState";
import "./mapControls.css";

export function MapLoadingOverlay({ ready, className }: { ready: boolean; className: string }) {
  const { exiting, setFinished, hidden } = useMapLoadingState(ready);
  if (hidden) return null;
  return <div className={className} aria-hidden={ready || undefined} data-ready={ready || undefined} data-exiting={exiting || undefined} onAnimationEnd={(event) => {
    if (event.target === event.currentTarget && exiting) setFinished(true);
  }}><Spinner label="Loading map..." /></div>;
}
