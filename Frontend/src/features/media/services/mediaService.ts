import { api } from "../../../services/api";
import type { MediaFile, MediaKindFilter, OwnedMediaCounts, PagedMedia } from "../types";

function mediaQuery(offset: number, limit: number, mediaKind?: MediaKindFilter): string {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (mediaKind) params.set("mediaKind", mediaKind);
  return params.toString();
}

export const mediaService = {
  list(offset = 0, limit = 20, mediaKind?: MediaKindFilter, signal?: AbortSignal): Promise<PagedMedia> {
    return api(`/api/library/album/media?${mediaQuery(offset, limit, mediaKind)}`, { signal });
  },

  ownedCounts(signal?: AbortSignal): Promise<OwnedMediaCounts> {
    return api("/api/library/album/media/mine/count", { signal });
  },

  get(mediaId: string): Promise<MediaFile> {
    return api(`/api/library/album/media/${encodeURIComponent(mediaId)}`);
  },

  isFileAvailable(mediaId: string): Promise<boolean> {
    return api(`/api/library/album/media/${encodeURIComponent(mediaId)}/availability`, { cache: "no-store" });
  },

  favorites(offset = 0, limit = 20, mediaKind?: MediaKindFilter, signal?: AbortSignal): Promise<PagedMedia> {
    return api(`/api/library/album/media/favorite?${mediaQuery(offset, limit, mediaKind)}`, { signal });
  },

  favorite(mediaId: string): Promise<void> {
    return api(`/api/library/album/media/${mediaId}/favorite`, { method: "POST" });
  },

  unfavorite(mediaId: string): Promise<void> {
    return api(`/api/library/album/media/${mediaId}/favorite`, { method: "DELETE" });
  },

  setFavorites(mediaIds: string[], isFavorite: boolean): Promise<void> {
    return api("/api/library/album/media/favorite/batch", {
      method: "PUT",
      body: { mediaIds, isFavorite },
    });
  },
};
