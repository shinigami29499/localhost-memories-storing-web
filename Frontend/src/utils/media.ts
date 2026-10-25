import { useAuthStore } from "../store/authStore";

/**
 * Media files are served by the backend with JWT auth. Browser media elements
 * (<img>/<video> src) cannot attach Authorization headers, so the access token
 * is passed via the ?accessToken= query parameter (supported by the file endpoint only).
 */
export function mediaUrl(mediaId: string, includeDeleted = false): string {
  const base = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
  const token = useAuthStore.getState().accessToken ?? "";
  return `${base}/api/media/${mediaId}/file?accessToken=${encodeURIComponent(token)}${includeDeleted ? "&includeDeleted=true" : ""}`;
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return date.toLocaleDateString();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
