import { describe, expect, it } from "vitest";
import { viewportBounds } from "./mapBounds";

const bounds = (west: number, south: number, east: number, north: number) => ({
  getWest: () => west, getSouth: () => south, getEast: () => east, getNorth: () => north,
});

describe("map viewport bounds", () => {
  it("preserves a viewport that crosses the antimeridian", () => {
    expect(viewportBounds(bounds(170, -20, 190, 30))).toEqual({ west: 170, south: -20, east: -170, north: 30 });
  });

  it("limits a repeated world view to the whole earth", () => {
    expect(viewportBounds(bounds(-250, -95, 250, 95))).toEqual({ west: -180, south: -90, east: 180, north: 90 });
  });
});
