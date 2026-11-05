import { useCallback, useEffect, useState } from "react";
import type { MapBounds } from "../types";

const world: MapBounds = { west: -180, south: -90, east: 180, north: 90 };

export function useMapBounds() {
  const [pending, setPending] = useState<MapBounds>(world);
  const [bounds, setBounds] = useState<MapBounds>(world);
  const update = useCallback((next: MapBounds) => setPending((current) =>
    current.west === next.west && current.south === next.south
      && current.east === next.east && current.north === next.north ? current : next), []);
  useEffect(() => {
    const timer = window.setTimeout(() => setBounds(pending), 200);
    return () => window.clearTimeout(timer);
  }, [pending]);
  return { bounds, update };
}
