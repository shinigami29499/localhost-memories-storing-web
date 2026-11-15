import { Spinner } from "../../../components/ui";
import { useMapLoadingState } from "./useMapLoadingState";

export function MapLoadingOverlay({ ready, className, closeDelay = 0 }: { ready: boolean; className: string; closeDelay?: number }) {
  const { exiting, setFinished, hidden } = useMapLoadingState(ready, closeDelay);
  if (hidden) return null;
  return <div className={className} data-exiting={exiting || undefined} onAnimationEnd={(event) => {
    if (event.target === event.currentTarget && exiting) setFinished(true);
  }}><Spinner label="Loading map..." /></div>;
}
