import { api } from "../../../services/api";
import type { MediaFile, MediaKindFilter, PagedMedia } from "../types";

function mediaQuery(offset: number, limit: number, mediaKind?: MediaKindFilter): string {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (mediaKind) params.set("mediaKind", mediaKind);
  return params.toString();
}

export const mediaService = {
  list(offset = 0, limit = 20, mediaKind?: MediaKindFilter): Promise<PagedMedia> {
    return api(`/api/library/gallery?${mediaQuery(offset, limit, mediaKind)}`);
  },

  get(mediaId: string): Promise<MediaFile> {
    return api(`/api/library/gallery/${encodeURIComponent(mediaId)}`);
  },

  isFileAvailable(mediaId: string): Promise<boolean> {
    return api(`/api/library/gallery/${encodeURIComponent(mediaId)}/availability`, { cache: "no-store" });
  },

  favorites(offset = 0, limit = 20, mediaKind?: MediaKindFilter): Promise<PagedMedia> {
    return api(`/api/library/gallery/favorites?${mediaQuery(offset, limit, mediaKind)}`);
  },

  deleted(offset = 0, limit = 20, mediaKind?: MediaKindFilter): Promise<PagedMedia> {
    return api(`/api/library/gallery/deleted?${mediaQuery(offset, limit, mediaKind)}`);
  },

  favorite(mediaId: string): Promise<void> {
    return api(`/api/library/gallery/${mediaId}/favorite`, { method: "POST" });
  },

  unfavorite(mediaId: string): Promise<void> {
    return api(`/api/library/gallery/${mediaId}/favorite`, { method: "DELETE" });
  },

  setFavorites(mediaIds: string[], isFavorite: boolean): Promise<void> {
    return api("/api/library/gallery/favorites/batch", {
      method: "PUT",
      body: { mediaIds, isFavorite },
    });
  },

  remove(mediaId: string): Promise<void> {
    return api(`/api/library/gallery/${mediaId}`, { method: "DELETE" });
  },

  restore(mediaId: string): Promise<void> {
    return api(`/api/library/gallery/${mediaId}/restore`, { method: "POST" });
  },

  permanentlyDelete(mediaId: string): Promise<void> {
    return api(`/api/library/gallery/${mediaId}/permanent`, { method: "DELETE" });
  },

  deleteRecord(mediaId: string): Promise<void> {
    return api(`/api/library/gallery/${encodeURIComponent(mediaId)}/record`, { method: "DELETE" });
  },
};
