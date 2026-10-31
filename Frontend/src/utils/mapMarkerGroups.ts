export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapMarkerGroup<T> {
  location: MapCoordinate;
  items: T[];
}

export type MapProjector = (location: MapCoordinate) => { x: number; y: number };

const CLUSTER_RADIUS_PX = 46;
const CLUSTER_RADIUS_DEGREES = 0.0008;

export function clusterMapMarkers<T>(
  items: readonly T[],
  getLocation: (item: T) => MapCoordinate | null | undefined,
  project: MapProjector | null,
): MapMarkerGroup<T>[] {
  const radius = project ? CLUSTER_RADIUS_PX : CLUSTER_RADIUS_DEGREES;
  const toPoint: MapProjector = project ?? ((location) => ({
    x: location.longitude,
    y: location.latitude,
  }));
  const groups: Array<MapMarkerGroup<T> & { x: number; y: number }> = [];

  for (const item of items) {
    const location = getLocation(item);
    if (!location) continue;
    const point = toPoint(location);
    const nearby = groups.find((group) => Math.hypot(group.x - point.x, group.y - point.y) <= radius);
    if (nearby) nearby.items.push(item);
    else groups.push({ location, items: [item], ...point });
  }

  return groups.map(({ location, items: groupedItems }) => ({
    location,
    items: groupedItems,
  }));
}
