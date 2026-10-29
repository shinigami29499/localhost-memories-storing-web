import { api } from "../../../services/api";
import type { MediaKindFilter, PagedMedia } from "../types";

function mediaQuery(offset: number, limit: number, mediaKind?: MediaKindFilter): string {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (mediaKind) params.set("mediaKind", mediaKind);
  return params.toString();
}

export const mediaService = {
  list(offset = 0, limit = 20, mediaKind?: MediaKindFilter): Promise<PagedMedia> {
    return api(`/api/media?${mediaQuery(offset, limit, mediaKind)}`);
  },

  favorites(offset = 0, limit = 20, mediaKind?: MediaKindFilter): Promise<PagedMedia> {
    return api(`/api/media/favorites?${mediaQuery(offset, limit, mediaKind)}`);
  },

  deleted(offset = 0, limit = 20, mediaKind?: MediaKindFilter): Promise<PagedMedia> {
    return api(`/api/media/deleted?${mediaQuery(offset, limit, mediaKind)}`);
  },

  favorite(mediaId: string): Promise<void> {
    return api(`/api/media/${mediaId}/favorite`, { method: "POST" });
  },

  unfavorite(mediaId: string): Promise<void> {
    return api(`/api/media/${mediaId}/favorite`, { method: "DELETE" });
  },

  remove(mediaId: string): Promise<void> {
    return api(`/api/media/${mediaId}`, { method: "DELETE" });
  },

  restore(mediaId: string): Promise<void> {
    return api(`/api/media/${mediaId}/restore`, { method: "POST" });
  },
};
