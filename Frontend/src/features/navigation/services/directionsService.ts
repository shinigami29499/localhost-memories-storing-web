export interface Coordinate {
  latitude: number;
  longitude: number;
}

export type TravelMode = "driving" | "walking" | "cycling";

export interface NavigationDestination extends Coordinate {
  name: string;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

export interface NavigationRoute {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  steps: RouteStep[];
}

export function isCoordinate(value: Coordinate): boolean {
  return Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90
    && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
}

export function googleDirectionsUrl(destination: Coordinate, mode: TravelMode): string {
  if (!isCoordinate(destination)) throw new Error("Invalid navigation coordinates.");
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", `${destination.latitude},${destination.longitude}`);
  url.searchParams.set("travelmode", mode === "cycling" ? "bicycling" : mode);
  url.searchParams.set("dir_action", "navigate");
  // Omitting origin lets Google Maps resolve the current location on the receiving device.
  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonnegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPosition(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2
    && typeof value[0] === "number" && typeof value[1] === "number"
    && isCoordinate({ longitude: value[0], latitude: value[1] });
}

export async function getDirections(
  origin: Coordinate,
  destination: Coordinate,
  mode: TravelMode,
  token: string,
  language: "en" | "vi",
  signal: AbortSignal,
): Promise<NavigationRoute> {
  if (!isCoordinate(origin) || !isCoordinate(destination))
    throw new Error("Invalid navigation coordinates.");
  if (!token.startsWith("pk."))
    throw new Error("Mapbox requires a public access token starting with pk. Never use a secret token in the frontend.");

  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/${mode}/${coordinates}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("steps", "true");
  url.searchParams.set("language", language);
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error("Could not load directions. Check internet access, the Mapbox token, billing, and usage limits.");
  const payload: unknown = await response.json();
  if (isRecord(payload) && (payload.code === "NoRoute" || payload.code === "NoSegment"))
    throw new Error("No route found for this travel mode. Choose another mode or destination.");
  const invalid = () => new Error("Mapbox returned invalid directions.");
  if (!isRecord(payload) || payload.code !== "Ok" || !Array.isArray(payload.routes))
    throw invalid();
  const route: unknown = payload.routes[0];
  if (!isRecord(route) || !isNonnegative(route.distance) || !isNonnegative(route.duration)
    || !isRecord(route.geometry) || route.geometry.type !== "LineString"
    || !Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length < 2
    || !route.geometry.coordinates.every(isPosition) || !Array.isArray(route.legs) || !route.legs.length)
    throw invalid();
  const steps: RouteStep[] = [];
  for (const leg of route.legs) {
    if (!isRecord(leg) || !Array.isArray(leg.steps) || !leg.steps.length) throw invalid();
    for (const step of leg.steps) {
      if (!isRecord(step) || !isNonnegative(step.distance) || !isNonnegative(step.duration)
        || !isRecord(step.maneuver) || typeof step.maneuver.instruction !== "string"
        || !step.maneuver.instruction.trim()) throw invalid();
      steps.push({
        instruction: step.maneuver.instruction,
        distance: step.distance,
        duration: step.duration,
      });
    }
  }
  return {
    coordinates: route.geometry.coordinates,
    distance: route.distance,
    duration: route.duration,
    steps,
  };
}
