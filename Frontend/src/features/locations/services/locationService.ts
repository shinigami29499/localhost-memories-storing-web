import { api } from "../../../services/api";
import type { PhotoLocation } from "../../media/types";

export interface LocationScanResult {
  scanned: number;
  located: number;
  failedMediaIds: string[];
  nextOffset: number;
  hasMore: boolean;
}

export const locationService = {
  set(mediaId: string, location: PhotoLocation | null): Promise<void> {
    return api(`/api/media/${mediaId}/location`, {
      method: "PUT",
      body: { latitude: location?.latitude ?? null, longitude: location?.longitude ?? null },
    });
  },

  scan(offset: number, signal: AbortSignal): Promise<LocationScanResult> {
    return api(`/api/media/locations/scan?offset=${offset}`, { method: "POST", signal });
  },
};
