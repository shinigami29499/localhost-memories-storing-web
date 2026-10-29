export type AlbumScope = "mine" | "public";

export const ALBUM_NAME_MAX_LENGTH = 100;

export interface Album {
  id: string;
  name: string;
  isPublic: boolean;
  owner: { id: string; username: string };
  mediaCount: number;
  /** Custom preview when set, otherwise the first image in the album. */
  previewMediaId: string | null;
  customPreviewMediaId: string | null;
  containsMedia: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateAlbumInput {
  name: string;
  isPublic?: boolean;
}

export interface UpdateAlbumInput {
  name: string;
  isPublic: boolean;
  previewMediaId: string | null;
}
