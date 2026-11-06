import { Marker } from "react-map-gl/mapbox";
import type { PickedLocation } from "../../media/types";

interface Props {
  location: PickedLocation;
  label: string;
  draggable: boolean;
  onPick: (location: PickedLocation) => void;
  onClick?: () => void;
}

export function MapDraftMarker({ location, label, draggable, onPick, onClick }: Props) {
  return (
    <Marker
      latitude={location.latitude}
      longitude={location.longitude}
      anchor="bottom"
      draggable={draggable}
      style={{ zIndex: 3 }}
      onClick={(event) => {
        event.originalEvent.stopPropagation();
        onClick?.();
      }}
      onDragEnd={(event) => {
        const point = event.lngLat.wrap();
        onPick({ latitude: point.lat, longitude: point.lng });
      }}
    >
      <div className="map-marker map-marker--draft map-draft-marker" role="img" aria-label={label} title={label}>
        <span className="map-marker__pin map-draft-marker__pin" aria-hidden="true"><span className="map-marker__center" /></span>
      </div>
    </Marker>
  );
}
