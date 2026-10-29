import { useAuthStore } from "../store/authStore";

/**
 * Media files are served by the backend with JWT auth. Browser media elements
 * (<img>/<video> src) cannot attach Authorization headers, so the access token
 * is passed via the ?accessToken= query parameter (supported by the file endpoint only).
 */
export function mediaUrl(mediaId: string, includeDeleted = false): string {
  const configuredBase = import.meta.env.VITE_API_URL?.trim();
  const base = (configuredBase || "http://localhost:8000").replace(/\/$/, "");
  const token = useAuthStore.getState().accessToken ?? "";
  return `${base}/api/media/${mediaId}/file?accessToken=${encodeURIComponent(token)}${includeDeleted ? "&includeDeleted=true" : ""}`;
}

export function mediaPreviewUrl(mediaId: string, includeDeleted = false): string {
  return `${mediaUrl(mediaId, includeDeleted)}&preview=true`;
}

export function formatTimestamp(iso: string, language: "en" | "vi" = "en"): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return language === "vi" ? "vừa xong" : "just now";
  if (minutes < 60) return language === "vi" ? `${minutes} phút trước` : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return language === "vi" ? `${hours} giờ trước` : `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return language === "vi" ? `${days} ngày trước` : `${days} d ago`;
  return date.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
