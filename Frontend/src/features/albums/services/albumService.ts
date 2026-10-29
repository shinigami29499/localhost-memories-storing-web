import { api } from "../../../services/api";
import type { PagedMedia } from "../../media";
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

  media(albumId: string, offset = 0, limit = 20): Promise<PagedMedia> {
    return api(`/api/collections/${albumId}/media?offset=${offset}&limit=${limit}`);
  },

  create(input: CreateAlbumInput): Promise<Album> {
    return api<Album>("/api/collections", { method: "POST", body: { ...input } });
  },

  update(albumId: string, input: UpdateAlbumInput): Promise<Album> {
    return api<Album>(`/api/collections/${albumId}`, { method: "PUT", body: { ...input } });
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
