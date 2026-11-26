import { api, uploadWithProgress } from "../../../services/api";
import type { MediaFile, PagedMedia } from "../types";

export const previewService = {
  list(offset = 0, limit = 48, signal?: AbortSignal): Promise<PagedMedia> {
    return api(`/api/preview?offset=${offset}&limit=${limit}`, { signal });
  },
  getImage(mediaId: string, signal?: AbortSignal): Promise<MediaFile> {
    return api(`/api/preview/${mediaId}`, { signal });
  },
  upload(file: File, onProgress: (loaded: number, transferred: boolean) => void, signal: AbortSignal): Promise<MediaFile> {
    return uploadWithProgress("/api/preview", file, onProgress, signal);
  },
  releaseDraft(mediaId: string): Promise<void> {
    return api(`/api/preview/${mediaId}/draft`, { method: "DELETE" });
  },
};
