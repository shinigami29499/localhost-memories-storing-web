import { api } from "../../../services/api";
import type { PagedMedia } from "../../media";
import type { MediaKindFilter } from "../../media/types";
import type { Album, AlbumScope, CreateAlbumInput, UpdateAlbumInput } from "../types";

export const albumService = {
  list(scope: AlbumScope = "mine", mediaId?: string): Promise<Album[]> {
    const params = new URLSearchParams({ scope });
    if (mediaId) params.set("mediaId", mediaId);
    return api(`/api/collections?${params.toString()}`);
  },

  get(albumId: string): Promise<Album> {
    return api(`/api/collections/${albumId}`);
  },

  media(albumId: string, offset = 0, limit = 20, mediaKind?: MediaKindFilter): Promise<PagedMedia> {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
    if (mediaKind) params.set("mediaKind", mediaKind);
    return api(`/api/collections/${albumId}/media?${params.toString()}`);
  },

  create(input: CreateAlbumInput): Promise<Album> {
    return api<Album>("/api/collections", { method: "POST", body: { ...input } });
  },

  update(albumId: string, input: UpdateAlbumInput): Promise<Album> {
    return api<Album>(`/api/collections/${albumId}`, { method: "PUT", body: { ...input } });
  },

  updateCaption(albumId: string, caption: string): Promise<Album> {
    return api<Album>(`/api/collections/${albumId}/caption`, { method: "PUT", body: { caption } });
  },

  remove(albumId: string): Promise<void> {
    return api<void>(`/api/collections/${albumId}`, { method: "DELETE" });
  },

  addMedia(albumId: string, mediaId: string): Promise<Album> {
    return api<Album>(`/api/collections/${albumId}/media`, { method: "POST", body: { mediaId } });
  },

  removeMedia(albumId: string, mediaId: string): Promise<Album> {
    return api<Album>(`/api/collections/${albumId}/media/${mediaId}`, { method: "DELETE" });
  },
};
