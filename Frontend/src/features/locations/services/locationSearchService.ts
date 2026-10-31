import type { HomeLocation } from "../types";

export interface LocationSearchResult extends HomeLocation {
  id: string;
  placeName: string;
}

const SEARCH_ERROR = "Could not search locations. Check your connection and try again.";
const INVALID_RESPONSE = "Location search returned an invalid response. Try again later.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseResult(value: unknown, index: number): LocationSearchResult {
  if (!isRecord(value) || !isRecord(value.geometry) || !isRecord(value.properties)
    || value.geometry.type !== "Point" || !Array.isArray(value.geometry.coordinates))
    throw new Error(INVALID_RESPONSE);

  const [longitude, latitude] = value.geometry.coordinates;
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    throw new Error(INVALID_RESPONSE);

  const properties = value.properties;
  const address = [
    properties.name,
    [properties.housenumber, properties.street].filter((part) => typeof part === "string" && part.trim()).join(" "),
    properties.district,
    properties.city,
    properties.state,
    properties.country,
  ].filter((part): part is string => typeof part === "string" && !!part.trim());
  const placeName = [...new Set(address)].join(", ");
  if (!placeName) throw new Error(INVALID_RESPONSE);

  return { id: `photon:${index}:${longitude},${latitude}`, latitude, longitude, placeName };
}

export async function searchLocations(query: string, signal?: AbortSignal): Promise<LocationSearchResult[]> {
  const text = query.trim();
  if (text.length < 3) throw new Error("Enter at least 3 characters to search.");

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", text);
  url.searchParams.set("limit", "5");
  const timeout = AbortSignal.timeout(10000);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    credentials: "omit",
  });
  if (!response.ok) throw new Error(SEARCH_ERROR);
  const data: unknown = await response.json();
  if (!isRecord(data) || data.type !== "FeatureCollection" || !Array.isArray(data.features))
    throw new Error(INVALID_RESPONSE);
  return data.features.slice(0, 5).map(parseResult);
}
