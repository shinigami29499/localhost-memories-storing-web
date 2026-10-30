import type { HomeLocation } from "../types";

export interface LocationSearchResult extends HomeLocation {
  id: string;
  placeName: string;
}

interface GeocodingFeature {
  id?: unknown;
  place_name?: unknown;
  center?: unknown;
}

interface GeocodingResponse {
  features?: unknown;
}

export async function searchLocations(
  query: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<LocationSearchResult[]> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  );
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("limit", "5");

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Location search request failed.");

  const payload = await response.json() as GeocodingResponse;
  if (!Array.isArray(payload.features)) throw new Error("Location search returned invalid results.");

  return payload.features.flatMap((item): LocationSearchResult[] => {
    if (!item || typeof item !== "object") return [];
    const feature = item as GeocodingFeature;
    if (typeof feature.id !== "string" || typeof feature.place_name !== "string"
      || !Array.isArray(feature.center) || feature.center.length < 2) return [];

    const [longitude, latitude] = feature.center;
    if (typeof longitude !== "number" || !Number.isFinite(longitude)
      || longitude < -180 || longitude > 180
      || typeof latitude !== "number" || !Number.isFinite(latitude)
      || latitude < -90 || latitude > 90) return [];

    return [{
      id: feature.id,
      placeName: feature.place_name,
      latitude,
      longitude,
    }];
  });
}
