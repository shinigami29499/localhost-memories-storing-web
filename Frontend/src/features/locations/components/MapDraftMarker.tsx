import { Marker, useMap } from "react-map-gl/mapbox";
import { useEffect, useState } from "react";
import type { PickedLocation } from "../../media/types";

interface Props {
  location: PickedLocation;
  label: string;
  draggable: boolean;
  onPick: (location: PickedLocation) => void;
  onClick?: () => void;
}

export function MapDraftMarker({ location, label, draggable, onPick, onClick }: Props) {
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
  return (
    <>
    <Marker latitude={shadowLocation.latitude} longitude={shadowLocation.longitude} anchor="bottom" style={{ zIndex: 0, pointerEvents: "none" }}>
      <div className="map-shadow-layer" aria-hidden="true"><span className="map-marker__shadow map-draft-shadow" /></div>
    </Marker>
    <Marker
      latitude={location.latitude}
      longitude={location.longitude}
      anchor="bottom"
      draggable={draggable}
      style={{ zIndex: 100000 + Math.round(screenY * 10) }}
      onClick={(event) => {
        event.originalEvent.stopPropagation();
        onClick?.();
      }}
      onDrag={(event) => {
        const point = event.lngLat.wrap();
        setShadowLocation({ ...location, latitude: point.lat, longitude: point.lng });
      }}
      onDragEnd={(event) => {
        const point = event.lngLat.wrap();
        setShadowLocation({ ...location, latitude: point.lat, longitude: point.lng });
        onPick({ latitude: point.lat, longitude: point.lng });
      }}
    >
      <div className="map-marker map-marker--draft map-draft-marker" role="img" aria-label={label} title={label}>
        <span className="map-marker__pin map-draft-marker__pin" aria-hidden="true"><span className="map-marker__center" /></span>
      </div>
    </Marker>
    </>
  );
}
