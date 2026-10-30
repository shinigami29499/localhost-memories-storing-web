import type { Coordinate, NavigationRoute } from "../services/directionsService";

const METERS_PER_RADIAN = 6371008.8;
const radians = (degrees: number) => degrees * Math.PI / 180;
const wrapLongitude = (degrees: number) => ((degrees + 540) % 360) - 180;

export function distanceBetween(a: Coordinate, b: Coordinate): number {
  const latitude = radians(b.latitude - a.latitude);
  const longitude = radians(wrapLongitude(b.longitude - a.longitude));
  const haversine = Math.sin(latitude / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitude / 2) ** 2;
  return 2 * METERS_PER_RADIAN * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function routeProgress(route: NavigationRoute, position: Coordinate) {
  let total = 0;
  let along = 0;
  let offRoute = Infinity;
  const scale = Math.cos(radians(position.latitude));
  for (let index = 1; index < route.coordinates.length; index++) {
    const [aLongitude, aLatitude] = route.coordinates[index - 1];
    const [bLongitude, bLatitude] = route.coordinates[index];
    const ax = radians(wrapLongitude(aLongitude - position.longitude)) * scale * METERS_PER_RADIAN;
    const ay = radians(aLatitude - position.latitude) * METERS_PER_RADIAN;
    const dx = radians(wrapLongitude(bLongitude - aLongitude)) * scale * METERS_PER_RADIAN;
    const dy = radians(bLatitude - aLatitude) * METERS_PER_RADIAN;
    const lengthSquared = dx * dx + dy * dy;
    const fraction = lengthSquared ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared)) : 0;
    const distance = Math.hypot(ax + fraction * dx, ay + fraction * dy);
    const length = distanceBetween(
      { longitude: aLongitude, latitude: aLatitude },
      { longitude: bLongitude, latitude: bLatitude },
    );
    if (distance < offRoute) {
      offRoute = distance;
      along = total + fraction * length;
    }
    total += length;
  }
  const traveled = total ? route.distance * along / total : 0;
  let stepIndex = 0;
  let stepEnd = route.steps[0]?.distance ?? 0;
  while (stepIndex < route.steps.length - 1 && traveled >= stepEnd) {
    stepIndex++;
    stepEnd += route.steps[stepIndex].distance;
  }
  const remaining = Math.max(0, route.distance - traveled);
  const step = route.steps[stepIndex];
  // The next step's maneuver happens at the end of the current step.
  const instruction = route.steps[stepIndex + 1]?.instruction ?? step?.instruction;
  const stepFraction = step?.distance ? Math.max(0, stepEnd - traveled) / step.distance : 0;
  const duration = (step?.duration ?? 0) * stepFraction
    + route.steps.slice(stepIndex + 1).reduce((sum, item) => sum + item.duration, 0);
  return { offRoute, remaining, duration, instruction, nextTurnDistance: Math.max(0, stepEnd - traveled) };
}
