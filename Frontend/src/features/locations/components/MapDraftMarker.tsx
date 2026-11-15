import { Marker } from "react-map-gl/mapbox";
import { useMapDraftMarker } from "./useMapDraftMarker";
import type { PickedLocation } from "../../media/types";

interface Props {
  location: PickedLocation;
  label: string;
  draggable: boolean;
  onPick: (location: PickedLocation) => void;
  onClick?: () => void;
}

export function MapDraftMarker({ location, label, draggable, onPick, onClick }: Props) {
  const { shadowLocation, screenY, drag, dragEnd } = useMapDraftMarker(location, onPick);
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
      onDrag={drag}
      onDragEnd={dragEnd}
    >
      <div className="map-marker map-marker--draft map-draft-marker" role="img" aria-label={label} title={label}>
        <span className="map-marker__pin map-draft-marker__pin" aria-hidden="true"><span className="map-marker__center" /></span>
      </div>
    </Marker>
    </>
  );
}
