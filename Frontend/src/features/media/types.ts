export interface MediaFile {
  id: string;
  mediaKind: "image" | "video";
  mimeType: string;
  originalFilename: string;
  fileSizeBytes: number;
  createdAt: string;
  isFavorited: boolean;
  ownerId?: string;
  ownerUsername?: string | null;
  location?: PhotoLocation | null;
}

export interface PhotoLocation {
  latitude: number;
  longitude: number;
}

/** A map pick; `placeName` is set when the pick snapped to a basemap place and is not persisted. */
export interface PickedLocation extends PhotoLocation {
  placeName?: string;
}

export interface PagedMedia {
  offset: number;
  limit: number;
  total: number;
  items: MediaFile[];
}

export type MediaKindFilter = MediaFile["mediaKind"];
