import { api } from "../../../services/api";
import type { PagedMedia } from "../../media";
import type { MediaKindFilter } from "../../media/types";
import type { Album, AlbumScope, CreateAlbumInput, UpdateAlbumInput } from "../types";

export const albumService = {
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
};
