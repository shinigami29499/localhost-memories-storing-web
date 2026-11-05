import type { MapBounds } from "../types";

export function viewportBounds(bounds: { getWest(): number; getSouth(): number; getEast(): number; getNorth(): number }): MapBounds {
  const west = bounds.getWest();
  const east = bounds.getEast();
  const wrap = (value: number) => ((value + 180) % 360 + 360) % 360 - 180;
  return {
    west: east - west >= 360 ? -180 : Math.max(-180, Math.floor(wrap(west) * 10000) / 10000),
    east: east - west >= 360 ? 180 : Math.min(180, Math.ceil(wrap(east) * 10000) / 10000),
    south: Math.max(-90, Math.floor(bounds.getSouth() * 10000) / 10000),
    north: Math.min(90, Math.ceil(bounds.getNorth() * 10000) / 10000),
  };
}
