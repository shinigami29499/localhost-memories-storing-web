import { api } from "../../../services/api";
import type { MediaFile, PagedMedia } from "../types";

export const previewService = {
  list(offset = 0, limit = 48): Promise<PagedMedia> {
    return api(`/api/previews?offset=${offset}&limit=${limit}`);
  },
  getImage(mediaId: string): Promise<MediaFile> {
    return api(`/api/previews/${mediaId}`);
  },
  upload(file: File): Promise<MediaFile> {
    const body = new FormData();
    body.append("file", file, file.name);
    return api("/api/previews", { method: "POST", body });
  },
  releaseDraft(mediaId: string): Promise<void> {
    return api(`/api/previews/${mediaId}/draft`, { method: "DELETE" });
  },
};
