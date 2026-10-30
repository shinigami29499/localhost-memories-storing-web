import { describe, expect, it, vi } from "vitest";
import type { MapMouseEvent } from "react-map-gl/mapbox";
import { findPlaceAt } from "./findPlaceAt";

function clickEvent(features: unknown[], options: { hasPoiLayer?: boolean; throws?: boolean } = {}) {
  const queryRenderedFeatures = vi.fn(() => {
    if (options.throws) throw new Error("no featureset");
    return features;
  });
  const event = {
    point: { x: 100, y: 50 },
    target: { queryRenderedFeatures, getLayer: vi.fn(() => (options.hasPoiLayer ?? true) ? {} : undefined) },
  } as unknown as MapMouseEvent;
  return { event, queryRenderedFeatures };
}

const hospital = {
  geometry: { type: "Point", coordinates: [105.8489, 21.0187] },
  properties: { name: " Vietnam – Cuba Friendship Hospital " },
};

describe("findPlaceAt", () => {
  it("snaps to a Standard-style POI from the basemap featureset", () => {
    const { event, queryRenderedFeatures } = clickEvent([hospital]);
    expect(findPlaceAt(event, "standard")).toEqual({
      latitude: 21.0187,
      longitude: 105.8489,
      placeName: "Vietnam – Cuba Friendship Hospital",
    });
    expect(queryRenderedFeatures).toHaveBeenCalledWith(
      [[96, 46], [104, 54]],
      { target: { featuresetId: "poi", importId: "basemap" } },
    );
  });

  it("queries the poi-label layer on classic styles and skips non-point features", () => {
    const { event, queryRenderedFeatures } = clickEvent([
      { geometry: { type: "Polygon", coordinates: [] }, properties: { name: "Area" } },
      { geometry: { type: "Point", coordinates: [1, 2] }, properties: {} },
    ]);
    expect(findPlaceAt(event, "classic")).toEqual({ latitude: 2, longitude: 1, placeName: undefined });
    expect(queryRenderedFeatures).toHaveBeenCalledWith(expect.anything(), { layers: ["poi-label"] });
  });

  it("returns null when no place is under the click or the style cannot be queried", () => {
    expect(findPlaceAt(clickEvent([]).event, "standard")).toBeNull();
    expect(findPlaceAt(clickEvent([hospital], { hasPoiLayer: false }).event, "classic")).toBeNull();
    expect(findPlaceAt(clickEvent([hospital], { throws: true }).event, "standard")).toBeNull();
    expect(findPlaceAt({} as MapMouseEvent, "standard")).toBeNull();
  });
});
