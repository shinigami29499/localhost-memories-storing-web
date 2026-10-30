import { api } from "../../../services/api";
import type { HomeLocation } from "../types";

export const homeLocationService = {
  get(): Promise<HomeLocation | null> {
    return api("/api/users/me/home-location");
  },

  set(location: HomeLocation): Promise<HomeLocation> {
    return api("/api/users/me/home-location", {
      method: "PUT",
      body: { latitude: location.latitude, longitude: location.longitude },
    });
  },

  clear(): Promise<void> {
    return api("/api/users/me/home-location", { method: "DELETE" });
  },
};
