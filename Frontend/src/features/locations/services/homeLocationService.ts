import { api } from "../../../services/api";
import type { HomeLocation } from "../types";

export const homeLocationService = {
  get(): Promise<HomeLocation | null> {
    return api("/api/location/food/home-location");
  },

  set(location: HomeLocation, applyToUnlocatedPhotos = false): Promise<HomeLocation> {
    return api("/api/location/food/home-location", {
      method: "PUT",
      body: {
        latitude: location.latitude,
        longitude: location.longitude,
        applyToUnlocatedPhotos,
      },
    });
  },

  clear(): Promise<void> {
    return api("/api/location/food/home-location", { method: "DELETE" });
  },
};
