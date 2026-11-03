import { api } from "../../../services/api";
import type { Place, PlaceVisit, SavePlaceInput } from "../types";

const LEGACY_PURPLE_MARKER = "#7048E8";
const REPLACEMENT_MARKER_COLOR = "#0EA5E9";

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
  list(): Promise<Place[]> {
    return api<Place[]>("/api/location").then((places) => places.map((place) => ({
      ...place,
      markerColor: place.markerColor.toUpperCase() === LEGACY_PURPLE_MARKER
        ? REPLACEMENT_MARKER_COLOR
        : place.markerColor,
    })));
  },

  visitHistory(): Promise<PlaceVisit[]> {
    return api<PlaceVisit[]>("/api/location/visits");
  },

  allVisitHistory(): Promise<PlaceVisit[]> {
    return api<PlaceVisit[]>("/api/location/visits/all");
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
