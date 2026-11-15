import type { CSSProperties } from "react";
import { usePlaceMarkerController, type PlaceMarkerProps } from "@/features/place/components/PlaceMapShared";
import { MobilePlaceMarkerPreview as PlaceMarkerPreview } from "./MobilePlaceMarkerPreview";

export function MobilePlaceMarker(props: PlaceMarkerProps) {
  const { place, selected, onSelect, canChange, onMove, onDelete, onDragChange, hidePreview, MarkerPreview = PlaceMarkerPreview } = props;
  const { t, animateMarker, map, pinRef, offset, hovered, setHovered, preview, changeable, cancelGesture, handlePointerDown, handlePointerMove, handlePointerUp, handleContextMenu, handleKeyDown, handleClick } = usePlaceMarkerController(props);

  return (
    <div className="map-marker place__marker" data-selected={selected} style={{ translate: `${offset.x}px ${offset.y}px`, "--marker-color": place.markerColor } as CSSProperties}
      onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}>
      <button
        ref={pinRef}
        type="button"
        className="map-marker__pin place__pin"
      data-marker-motion={animateMarker}
        data-changeable={changeable}
        title={changeable ? t("Drag to move this place. Hold or right-click to delete.") : place.name}
        aria-label={place.name}
        aria-pressed={selected}
        aria-haspopup="dialog"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onLostPointerCapture={cancelGesture}
        onPointerCancel={cancelGesture}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
      >
        <span className="map-marker__center" aria-hidden="true">{place.markerIcon}</span>
      </button>
      {!hidePreview && (hovered || selected) && <button type="button" className="place__popup" aria-label={place.name} tabIndex={selected ? 0 : -1} onClick={(event) => { event.stopPropagation(); onSelect(place); }}>
        <MarkerPreview place={place} mediaIds={preview.data?.mediaIds ?? []} />
      </button>}
    </div>
  );
}
