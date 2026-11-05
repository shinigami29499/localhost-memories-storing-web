import { Spinner } from "../../../components/ui";

export function MapLoadingOverlay({ ready, className }: { ready: boolean; className: string }) {
  if (ready) return null;
  return <div className={className}><Spinner label="Loading map…" /></div>;
}
