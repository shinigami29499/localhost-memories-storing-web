import { api } from "../../../services/api";
import type { PagedMedia } from "../../media";
import type { MediaKindFilter } from "../../media/types";
import type { Album, AlbumScope, CreateAlbumInput, UpdateAlbumInput } from "../types";

export const albumService = {
  page(scope: AlbumScope | "feed", cursor: string | null = null, limit = 30, mediaId?: string, search = "", signal?: AbortSignal): Promise<{
    items: Album[]; nextCursor: string | null; hasMore: boolean;
  }> {
    const params = new URLSearchParams({ scope, limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    if (mediaId) params.set("mediaId", mediaId);
    if (search.trim()) params.set("search", search.trim());
    const path = `/api/library/album/page?${params.toString()}`;
    return signal ? api(path, { signal }) : api(path);
  },

  async membership(mediaIds: string[], signal?: AbortSignal): Promise<{ items: { mediaId: string; albumIds: string[] }[] }> {
    const items: { mediaId: string; albumIds: string[] }[] = [];
    for (let offset = 0; offset < mediaIds.length; offset += 100) {
      const result = await api<{ items: { mediaId: string; albumIds: string[] }[] }>(
        "/api/library/album/membership/query", {
          method: "POST",
          body: { mediaIds: mediaIds.slice(offset, offset + 100) },
          ...(signal ? { signal } : {}),
        });
      items.push(...result.items);
    }
    return { items };
  },

  list(scope: AlbumScope = "mine", mediaId?: string): Promise<Album[]> {
    const params = new URLSearchParams({ scope });
    if (mediaId) params.set("mediaId", mediaId);
    return api(`/api/library/album?${params.toString()}`);
  },

  get(albumId: string): Promise<Album> {
    return api(`/api/library/album/${albumId}`);
  },

  media(albumId: string, offset = 0, limit = 20, mediaKind?: MediaKindFilter): Promise<PagedMedia> {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
    if (mediaKind) params.set("mediaKind", mediaKind);
    return api(`/api/library/album/${albumId}/media?${params.toString()}`);
  },

  create(input: CreateAlbumInput): Promise<Album> {
    return api<Album>("/api/library/album", { method: "POST", body: { ...input } });
  },

  update(albumId: string, input: UpdateAlbumInput): Promise<Album> {
    return api<Album>(`/api/library/album/${albumId}`, { method: "PUT", body: { ...input } });
  },

  uploadPreviewImage(albumId: string, file: File): Promise<Album> {
    const body = new FormData();
    body.append("file", file, file.name);
    return api<Album>(`/api/library/album/${albumId}/preview`, { method: "POST", body });
  },

  updateCaption(albumId: string, caption: string): Promise<Album> {
    return api<Album>(`/api/library/album/${albumId}/caption`, { method: "PUT", body: { caption } });
  },

  remove(albumId: string): Promise<void> {
    return api<void>(`/api/library/album/${albumId}`, { method: "DELETE" });
  },

  addMedia(albumId: string, mediaId: string): Promise<Album> {
    return api<Album>(`/api/library/album/${albumId}/media`, { method: "POST", body: { mediaId } });
  },

  removeMedia(albumId: string, mediaId: string): Promise<Album> {
    return api<Album>(`/api/library/album/${albumId}/media/${mediaId}`, { method: "DELETE" });
  },

  addMediaBatch(albumId: string, mediaIds: string[]): Promise<Album> {
    return api<Album>(`/api/library/album/${albumId}/media/batch`, { method: "POST", body: { mediaIds } });
  },

  removeMediaBatch(albumId: string, mediaIds: string[]): Promise<Album> {
    return api<Album>(`/api/library/album/${albumId}/media/batch/remove`, { method: "POST", body: { mediaIds } });
  },
};
