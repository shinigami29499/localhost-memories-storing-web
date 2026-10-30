export interface FoodPlaceOwner {
  id: string;
  username: string;
  avatarSeed?: string | null;
}

export interface FoodPlace {
  id: string;
  name: string;
  address: string;
  note: string;
  latitude: number;
  longitude: number;
  /** 1 to 5 stars; 0 when the place has not been rated. */
  rating: number;
  markerIcon: string;
  markerColor: string;
  owner: FoodPlaceOwner;
  createdAt: string;
  updatedAt: string | null;
  /** Library image ids in display order; the first is the cover. */
  mediaIds: string[];
}

export interface SaveFoodPlaceInput {
  name: string;
  address: string;
  note: string;
  latitude: number;
  longitude: number;
  rating: number;
  markerIcon: string;
  markerColor: string;
  mediaIds: string[];
}

export const MAX_FOOD_PLACE_IMAGES = 12;

export interface FoodCoordinate {
  latitude: number;
  longitude: number;
}

export const FOOD_MARKER_ICONS = [
  "🍜", "🍕", "🍣", "🍔", "🍗", "🥗", "🍱", "🌮", "🍲", "🥐", "🍰", "☕", "🍺", "🧋",
] as const;

export const FOOD_MARKER_COLORS = [
  "#E2572B", "#F08C00", "#F2B705", "#2F9E44", "#1C7ED6", "#0EA5E9", "#E64980", "#495057",
] as const;

export const DEFAULT_FOOD_MARKER_ICON = FOOD_MARKER_ICONS[0];
export const DEFAULT_FOOD_MARKER_COLOR = FOOD_MARKER_COLORS[0];
