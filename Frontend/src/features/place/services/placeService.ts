import { api } from "../../../services/api";
import type { Place, PlaceVisit, SavePlaceInput } from "../types";
import type { MapBounds } from "../../locations/types";

export interface PlacePage<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export type PlaceMapBounds = MapBounds;

function toBody(input: SavePlaceInput) {
  return {
    name: input.name,
    address: input.address,
    note: input.note,
    latitude: input.latitude,
    longitude: input.longitude,
    markerIcon: input.markerIcon,
    markerColor: input.markerColor,
    mediaIds: input.mediaIds,
  };
}

export const placeService = {
  map(): Promise<Place[]> {
    return api<Omit<Place, "mediaIds">[]>("/api/location/map").then((places) => places.map((place) => ({
      ...place,
      mediaIds: [],
    })));
  },

  mapPage(page: number, bounds: PlaceMapBounds, signal?: AbortSignal): Promise<PlacePage<Place>> {
    const params = new URLSearchParams({ page: String(page), limit: "100",
      west: String(bounds.west), south: String(bounds.south),
      east: String(bounds.east), north: String(bounds.north) });
    return api<PlacePage<Omit<Place, "mediaIds">>>(`/api/location/map/page?${params}`, { signal })
      .then((result) => ({ ...result, items: result.items.map((place) => ({ ...place, mediaIds: [] })) }));
  },

  get(placeId: string): Promise<Place> {
    return api(`/api/location/${placeId}`);
  },

  list(): Promise<Place[]> {
    return api<Place[]>("/api/location/saved");
  },

  page(page: number, limit: number, search = "", minimumRating = 0, signal?: AbortSignal): Promise<PlacePage<Place>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), minimumRating: String(minimumRating) });
    if (search.trim()) params.set("search", search.trim());
    return api(`/api/location/saved/page?${params}`, { signal });
  },

  visitPage(page: number, limit: number, all = false, placeId?: string, signal?: AbortSignal): Promise<PlacePage<PlaceVisit>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), all: String(all) });
    if (placeId) params.set("placeId", placeId);
    return api(`/api/location/history/page?${params}`, { signal });
  },

  visitHistory(): Promise<PlaceVisit[]> {
    return api<PlaceVisit[]>("/api/location/history");
  },

  allVisitHistory(): Promise<PlaceVisit[]> {
    return api<PlaceVisit[]>("/api/location/history/all");
  },

  visitsForPlace(placeId: string): Promise<PlaceVisit[]> {
    return api<PlaceVisit[]>(`/api/location/${placeId}/visits`);
  },

  checkIn(placeId: string): Promise<void> {
    return api(`/api/location/${placeId}/visits`, { method: "POST" });
  },

  removeVisit(visitId: string): Promise<void> {
    return api(`/api/location/visits/${visitId}`, { method: "DELETE" });
  },

  updateVisit(visitId: string, input: { note: string; rating: number }): Promise<PlaceVisit> {
    return api(`/api/location/visits/${visitId}`, { method: "PUT", body: input });
  },

  create(input: SavePlaceInput): Promise<Place> {
    return api("/api/location", { method: "POST", body: toBody(input) });
  },

  update(placeId: string, input: SavePlaceInput): Promise<Place> {
    return api(`/api/location/${placeId}`, { method: "PUT", body: toBody(input) });
  },

  remove(placeId: string): Promise<void> {
    return api(`/api/location/${placeId}`, { method: "DELETE" });
  },
};
