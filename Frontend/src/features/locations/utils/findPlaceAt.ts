import type { MapMouseEvent } from "react-map-gl/mapbox";
import type { PickedLocation } from "../../media/types";

/** `standard` is the Mapbox Standard style (POIs in the `basemap` import); `classic` covers styles such as streets-v12. */
export type BasemapKind = "standard" | "classic";

/** Extra pixels around the click so small place icons are easy to hit. */
const PLACE_HIT_PX = 4;

/** The fields read from a queried feature; mapbox's GeoJSON types depend on an optional types package. */
type PlaceFeature = {
  geometry?: { type: string; coordinates?: unknown };
  properties?: Record<string, unknown> | null;
};

/** Returns the basemap place (POI) under a map click, or null when the click is not on a place. */
export function findPlaceAt(event: MapMouseEvent, basemap: BasemapKind): PickedLocation | null {
  try {
    const map = event.target;
    const { x, y } = event.point;
    const box: [[number, number], [number, number]] = [
      [x - PLACE_HIT_PX, y - PLACE_HIT_PX],
      [x + PLACE_HIT_PX, y + PLACE_HIT_PX],
    ];
    const features = (basemap === "standard"
      ? map.queryRenderedFeatures(box, { target: { featuresetId: "poi", importId: "basemap" } })
      : map.getLayer("poi-label") ? map.queryRenderedFeatures(box, { layers: ["poi-label"] }) : []) as unknown as PlaceFeature[];
    for (const feature of features) {
      if (feature.geometry?.type !== "Point" || !Array.isArray(feature.geometry.coordinates)) continue;
      const [longitude, latitude] = feature.geometry.coordinates as unknown[];
      if (typeof latitude !== "number" || typeof longitude !== "number"
        || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
      const name = feature.properties?.name;
      return { latitude, longitude, placeName: typeof name === "string" && name.trim() ? name.trim() : undefined };
    }
  } catch {
    // A style without a POI featureset or layer falls back to the raw click point.
  }
  return null;
}
