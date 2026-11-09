export interface MediaFile {
  id: string;
  mediaKind: "image" | "video";
  originalFilename: string;
  createdAt: string;
  deletedAt?: string | null;
  isFavorited: boolean;
  isPreviewOnly?: boolean;
  ownerId?: string;
  ownerUsername?: string | null;
  location?: PhotoLocation | null;
}

export interface PhotoLocation {
  latitude: number;
  longitude: number;
  city?: string | null;
}

/** A map pick; `placeName` is set when the pick snapped to a basemap place and is not persisted. */
export interface PickedLocation extends PhotoLocation {
  placeName?: string;
}

export interface PagedMedia {
  offset: number;
  total: number;
  items: MediaFile[];
}

export interface OwnedMediaCounts {
  images: number;
  videos: number;
}

export type MediaKindFilter = MediaFile["mediaKind"];
