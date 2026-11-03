import { describe, expect, it } from "vitest";
import { clusterMapMarkers, isMarkerInViewport } from "./mapMarkerGroups";

describe("map marker viewport", () => {
  const project = ({ latitude, longitude }: { latitude: number; longitude: number }) => ({ x: longitude, y: latitude });

  it("includes only points inside the visible map and handles an unavailable viewport", () => {
    expect(isMarkerInViewport({ latitude: 50, longitude: 80 }, project, 100, 100)).toBe(true);
    expect(isMarkerInViewport({ latitude: -1, longitude: 80 }, project, 100, 100)).toBe(false);
    expect(isMarkerInViewport({ latitude: 50, longitude: 101 }, project, 100, 100)).toBe(false);
    expect(isMarkerInViewport({ latitude: 0, longitude: 0 }, null, 100, 100)).toBe(false);
    expect(isMarkerInViewport({ latitude: 0, longitude: 0 }, project, 0, 0)).toBe(false);
  });

  it("preserves all items in a group so pagination can reach them", () => {
    const markers = Array.from({ length: 45 }, (_, id) => ({ id, latitude: 20, longitude: 20 }));
    expect(clusterMapMarkers(markers, (marker) => marker, project)[0].items).toHaveLength(45);
  });
});
