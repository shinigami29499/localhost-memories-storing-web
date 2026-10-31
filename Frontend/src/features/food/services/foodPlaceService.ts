import { api } from "../../../services/api";
import type { FoodPlace, FoodPlaceVisit, SaveFoodPlaceInput } from "../types";

const LEGACY_PURPLE_MARKER = "#7048E8";
const REPLACEMENT_MARKER_COLOR = "#0EA5E9";

function toBody(input: SaveFoodPlaceInput) {
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

export const foodPlaceService = {
  list(): Promise<FoodPlace[]> {
    return api<FoodPlace[]>("/api/location/food").then((places) => places.map((place) => ({
      ...place,
      markerColor: place.markerColor.toUpperCase() === LEGACY_PURPLE_MARKER
        ? REPLACEMENT_MARKER_COLOR
        : place.markerColor,
    })));
  },

  visitHistory(): Promise<FoodPlaceVisit[]> {
    return api<FoodPlaceVisit[]>("/api/location/food/visits");
  },

  checkIn(foodPlaceId: string): Promise<void> {
    return api(`/api/location/food/${foodPlaceId}/visits`, { method: "POST" });
  },

  removeVisit(visitId: string): Promise<void> {
    return api(`/api/location/food/visits/${visitId}`, { method: "DELETE" });
  },

  create(input: SaveFoodPlaceInput): Promise<FoodPlace> {
    return api("/api/location/food", { method: "POST", body: toBody(input) });
  },

  update(foodPlaceId: string, input: SaveFoodPlaceInput): Promise<FoodPlace> {
    return api(`/api/location/food/${foodPlaceId}`, { method: "PUT", body: toBody(input) });
  },

  remove(foodPlaceId: string): Promise<void> {
    return api(`/api/location/food/${foodPlaceId}`, { method: "DELETE" });
  },
};
