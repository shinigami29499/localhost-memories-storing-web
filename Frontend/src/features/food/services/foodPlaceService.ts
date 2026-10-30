import { api } from "../../../services/api";
import type { FoodPlace, SaveFoodPlaceInput } from "../types";

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
    return api("/api/food-places");
  },

  create(input: SaveFoodPlaceInput): Promise<FoodPlace> {
    return api("/api/food-places", { method: "POST", body: toBody(input) });
  },

  update(foodPlaceId: string, input: SaveFoodPlaceInput): Promise<FoodPlace> {
    return api(`/api/food-places/${foodPlaceId}`, { method: "PUT", body: toBody(input) });
  },

  remove(foodPlaceId: string): Promise<void> {
    return api(`/api/food-places/${foodPlaceId}`, { method: "DELETE" });
  },
};
