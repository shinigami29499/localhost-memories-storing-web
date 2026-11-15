import { useEffect, useState } from "react";
import { useMap } from "react-map-gl/mapbox";
import type { PickedLocation } from "../../media/types";

type DragEvent = { lngLat: { wrap: () => { lat: number; lng: number } } };

export function useMapDraftMarker(location: PickedLocation, onPick: (location: PickedLocation) => void) {
  const { current: map } = useMap();
  const [shadowLocation, setShadowLocation] = useState(location);
  const [screenY, setScreenY] = useState(0);
  useEffect(() => setShadowLocation(location), [location]);
  useEffect(() => {
    if (!map || typeof map.project !== "function") return;
    const update = () => setScreenY(map.project([shadowLocation.longitude, shadowLocation.latitude]).y);
    update();
    map.on("move", update);
    map.on("resize", update);
    return () => { map.off("move", update); map.off("resize", update); };
  }, [map, shadowLocation.latitude, shadowLocation.longitude]);
  const drag = (event: DragEvent) => {
    const point = event.lngLat.wrap();
    setShadowLocation({ ...location, latitude: point.lat, longitude: point.lng });
  };
  const dragEnd = (event: DragEvent) => {
    const point = event.lngLat.wrap();
    setShadowLocation({ ...location, latitude: point.lat, longitude: point.lng });
    onPick({ latitude: point.lat, longitude: point.lng });
  };
  return { shadowLocation, screenY, drag, dragEnd };
}
