export interface PlaceOwner {
  id: string;
  username: string;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  note: string;
  rating: number;
  latitude: number;
  longitude: number;
  markerIcon: string;
  markerColor: string;
  owner: PlaceOwner;
  /** Gallery or shared-preview image ids in display order; the first is the cover. */
  mediaIds: string[];
}

export interface PlaceVisit {
  id: string;
  placeId: string;
  placeName: string;
  placeAddress: string;
  markerIcon: string;
  markerColor: string;
  visitedAt: string;
  userId: string;
  username: string;
  avatarSeed: string | null;
  note: string;
  rating: number;
}

export interface SavePlaceInput {
  name: string;
  address: string;
  note: string;
  latitude: number;
  longitude: number;
  markerIcon: string;
  markerColor: string;
  mediaIds: string[];
}

export const MAX_PLACE_IMAGES = 12;

export interface PlaceCoordinate {
  latitude: number;
  longitude: number;
}

export const PLACE_MARKER_ICONS = [
  "🍜", "🍕", "🍣", "🍔", "🍗", "🥗", "🍱", "🌮", "🍲", "🥐", "🍰", "☕", "🍺", "🧋",
] as const;

export const PLACE_MARKER_COLORS = [
  "#E2572B", "#F08C00", "#F2B705", "#2F9E44", "#1C7ED6", "#0EA5E9", "#E64980", "#495057",
] as const;

export const DEFAULT_PLACE_MARKER_ICON = PLACE_MARKER_ICONS[0];
export const DEFAULT_PLACE_MARKER_COLOR = PLACE_MARKER_COLORS[0];
