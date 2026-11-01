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
    rating: input.rating,
    markerIcon: input.markerIcon,
    markerColor: input.markerColor,
    mediaIds: input.mediaIds,
  };
}

export const placeService = {
  list(): Promise<Place[]> {
    return api<Place[]>("/api/location/place").then((places) => places.map((place) => ({
      ...place,
      markerColor: place.markerColor.toUpperCase() === LEGACY_PURPLE_MARKER
        ? REPLACEMENT_MARKER_COLOR
        : place.markerColor,
    })));
  },

  visitHistory(): Promise<PlaceVisit[]> {
    return api<PlaceVisit[]>("/api/location/place/visits");
  },

  allVisitHistory(): Promise<PlaceVisit[]> {
    return api<PlaceVisit[]>("/api/location/place/visits/all");
  },

  visitsForPlace(placeId: string): Promise<PlaceVisit[]> {
    return api<PlaceVisit[]>(`/api/location/place/${placeId}/visits`);
  },

  checkIn(placeId: string): Promise<void> {
    return api(`/api/location/place/${placeId}/visits`, { method: "POST" });
  },

  removeVisit(visitId: string): Promise<void> {
    return api(`/api/location/place/visits/${visitId}`, { method: "DELETE" });
  },

  create(input: SavePlaceInput): Promise<Place> {
    return api("/api/location/place", { method: "POST", body: toBody(input) });
  },

  update(placeId: string, input: SavePlaceInput): Promise<Place> {
    return api(`/api/location/place/${placeId}`, { method: "PUT", body: toBody(input) });
  },

  remove(placeId: string): Promise<void> {
    return api(`/api/location/place/${placeId}`, { method: "DELETE" });
  },
};
