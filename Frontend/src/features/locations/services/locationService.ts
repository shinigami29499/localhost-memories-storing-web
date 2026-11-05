import { api } from "../../../services/api";
import type { PagedMedia, PhotoLocation } from "../../media/types";
import type { MapBounds } from "../types";

export interface LocationScanResult {
  scanned: number;
  located: number;
  failedMediaIds: string[];
  nextOffset: number;
  hasMore: boolean;
}

export const locationService = {
  mapPage(offset: number, bounds: MapBounds, signal?: AbortSignal): Promise<PagedMedia> {
    const params = new URLSearchParams({ offset: String(offset), limit: "100",
      west: String(bounds.west), south: String(bounds.south),
      east: String(bounds.east), north: String(bounds.north) });
    return api(`/api/location/travel/map?${params}`, { signal });
  },

  unlocatedPage(offset: number, signal?: AbortSignal): Promise<PagedMedia> {
    return api(`/api/location/travel/unlocated?offset=${offset}&limit=50`, { signal });
  },

  set(mediaId: string, location: PhotoLocation | null): Promise<void> {
    return api(`/api/location/travel/${mediaId}`, {
      method: "PUT",
      body: { latitude: location?.latitude ?? null, longitude: location?.longitude ?? null },
    });
  },

  scan(offset: number, signal: AbortSignal): Promise<LocationScanResult> {
    return api(`/api/location/travel/scan?offset=${offset}`, { method: "POST", signal });
  },
};

