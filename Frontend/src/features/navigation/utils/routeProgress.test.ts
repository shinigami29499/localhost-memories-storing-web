import { describe, expect, it } from "vitest";
import type { NavigationRoute } from "../services/directionsService";
import { distanceBetween, routeProgress } from "./routeProgress";

const route: NavigationRoute = {
  distance: 2000, duration: 300,
  coordinates: [[0, 0], [0.01, 0], [0.01, 0.01]],
  steps: [
    { instruction: "Depart", distance: 1000, duration: 100 },
    { instruction: "Turn left", distance: 1000, duration: 200 },
    { instruction: "Arrive", distance: 0, duration: 0 },
  ],
};

describe("route progress", () => {
  it("measures off-route distance against segments, not sparse vertices", () => {
    const progress = routeProgress(route, { latitude: 0, longitude: 0.005 });
    expect(progress.offRoute).toBeCloseTo(0);
    expect(progress.remaining).toBeCloseTo(1500);
    expect(progress.duration).toBeCloseTo(250);
    expect(progress.nextTurnDistance).toBeCloseTo(500);
    expect(progress.instruction).toBe("Turn left");
  });

  it("advances instructions and remaining duration past a turn", () => {
    const progress = routeProgress(route, { latitude: 0.005, longitude: 0.01 });
    expect(progress.remaining).toBeCloseTo(500);
    expect(progress.duration).toBeCloseTo(100);
    expect(progress.instruction).toBe("Arrive");
  });

  it("detects departures beyond the 50 meter rerouting threshold", () => {
    expect(routeProgress(route, { latitude: -0.0004, longitude: 0.005 }).offRoute).toBeLessThan(50);
    expect(routeProgress(route, { latitude: -0.0005, longitude: 0.005 }).offRoute).toBeGreaterThan(50);
  });

  it("handles identical coordinates and zero-distance routes", () => {
    const progress = routeProgress({ ...route, coordinates: [[0, 0], [0, 0]], distance: 0 }, { latitude: 0, longitude: 0 });
    expect(progress.remaining).toBe(0);
    expect(progress.offRoute).toBe(0);
    expect(Number.isFinite(progress.duration)).toBe(true);
  });

  it("handles short antimeridian crossings", () => {
    const crossing = { ...route, coordinates: [[179.99, 0], [-179.99, 0]] as [number, number][] };
    const progress = routeProgress(crossing, { latitude: 0, longitude: 180 });
    expect(progress.offRoute).toBeCloseTo(0);
    expect(progress.remaining).toBeCloseTo(1000);
    expect(distanceBetween({ latitude: 0, longitude: 179.99 }, { latitude: 0, longitude: -179.99 }))
      .toBeCloseTo(2223.9, 0);
  });
});
