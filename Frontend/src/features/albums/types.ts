export type AlbumScope = "mine" | "public" | "all";

export const ALBUM_NAME_MAX_LENGTH = 100;
export const ALBUM_CAPTION_MAX_LENGTH = 4000;

export interface Album {
  id: string;
  name: string;
  caption: string;
  isPublic: boolean;
  owner: { id: string; username: string; avatarSeed?: string | null };
  mediaCount: number;
  isFavorited: boolean;
  /** Custom preview when set, otherwise the first image in the album. */
  previewMediaId: string | null;
  previewIsFavorited: boolean;
  customPreviewMediaId: string | null;
  containsMedia: boolean;
  createdAt: string;
  albumDate?: string | null;
}

export interface CreateAlbumInput {
  name: string;
  isPublic?: boolean;
  caption?: string;
  albumDate?: string;
}

export interface UpdateAlbumInput {
  name: string;
  isPublic: boolean;
  previewMediaId: string | null;
  caption?: string;
}
