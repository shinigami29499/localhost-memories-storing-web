import { api } from "../../../services/api";
import type { MediaFile, PagedMedia } from "../types";

export const previewService = {
  list(offset = 0, limit = 48, signal?: AbortSignal): Promise<PagedMedia> {
    return api(`/api/preview?offset=${offset}&limit=${limit}`, { signal });
  },
  getImage(mediaId: string, signal?: AbortSignal): Promise<MediaFile> {
    return api(`/api/preview/${mediaId}`, { signal });
  },
  upload(file: File): Promise<MediaFile> {
    const body = new FormData();
    body.append("file", file, file.name);
    return api("/api/preview", { method: "POST", body });
  },
  releaseDraft(mediaId: string): Promise<void> {
    return api(`/api/preview/${mediaId}/draft`, { method: "DELETE" });
  },
};
