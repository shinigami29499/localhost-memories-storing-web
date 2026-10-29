export interface MediaFile {
  id: string;
  mediaKind: "image" | "video";
  mimeType: string;
  originalFilename: string;
  fileSizeBytes: number;
  createdAt: string;
  isFavorited: boolean;
}

export interface PagedMedia {
  offset: number;
  limit: number;
  total: number;
  items: MediaFile[];
}

export type MediaKindFilter = MediaFile["mediaKind"];
