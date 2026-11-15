import type { CSSProperties } from "react";
import { Marker } from "react-map-gl/mapbox";
import { usePlaceClusterMarkerController, type PlaceClusterMarkerProps } from "@/features/place/components/PlaceMapShared";
import { MobilePlaceMarker as PlaceMarker } from "./MobilePlaceMarker";

export function MobilePlaceClusterMarker(props: PlaceClusterMarkerProps) {
  const { group, shadowLocation, selectedId, onSelect, canChange, onMove, onDelete, onDragChange, homeExpanded, nearHome, onHomeHoverChange, onActiveChange, hidePreview, hideCount, MarkerPreview, MarkerComponent = PlaceMarker } = props;
  const { t, open, setOpen, setPage, count, selectedIndex, expanded, ordered, pageCount, currentPage, visiblePlaces, step, toggleLabel } = usePlaceClusterMarkerController(props);

  return (
    <>
    <Marker latitude={shadowLocation.latitude} longitude={shadowLocation.longitude} anchor="bottom" style={{ zIndex: 0, pointerEvents: "none" }}>
      <div className={`place__cluster${count > 1 ? " place__cluster--group" : ""}`} data-open={expanded} data-home-expanded={homeExpanded} data-near-home={nearHome}
        style={{ "--fan-count": visiblePlaces.length, "--fan-step": `${step}deg` } as CSSProperties} aria-hidden="true">
        {visiblePlaces.map((place, index) => <span key={place.id} className="map-marker__shadow place__cluster-shadow"
          style={{ "--fan-index": index, "--marker-color": place.markerColor } as CSSProperties} />)}
      </div>
    </Marker>
    <div className={`place__cluster${count > 1 ? " place__cluster--group" : ""}`} data-open={expanded}
      data-home-expanded={homeExpanded} data-near-home={nearHome} data-selected={selectedIndex >= 0}
      style={{ "--fan-count": visiblePlaces.length, "--fan-step": `${step}deg`, "--counter-color": nearHome ? "#000" : `color-mix(in srgb, ${ordered[0].markerColor || "#30353b"}, black 35%)` } as CSSProperties}
      onPointerEnter={() => { setOpen(true); onActiveChange?.(true); onHomeHoverChange?.(true); }}
      onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) { setOpen(false); onActiveChange?.(false); onHomeHoverChange?.(false); } }}
      onFocus={() => { setOpen(true); onActiveChange?.(true); onHomeHoverChange?.(true); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(":hover")) { setOpen(false); onActiveChange?.(false); onHomeHoverChange?.(false); } }}
      >
      {visiblePlaces.map((place, index) => {
        return (
          <div
            key={place.id}
            className="place__cluster-marker"
            data-selected={place.id === selectedId}
            style={{
              "--fan-index": index,
            } as CSSProperties}
          >
            <MarkerComponent place={place} selected={place.id === selectedId} onSelect={onSelect}
              canChange={canChange} onMove={onMove} onDelete={onDelete} onDragChange={onDragChange} hidePreview={hidePreview} MarkerPreview={MarkerPreview} />
          </div>
        );
      })}
      {count > 1 && !hideCount && (
        <span className="place__cluster-count" aria-label={toggleLabel}>{count}</span>
      )}
      {expanded && pageCount > 1 && <button type="button" className="place__cluster-next"
        aria-label={t("Show next markers")} title={t("Show next markers")}
        onClick={(event) => { event.stopPropagation(); setPage((current) => (current + 1) % pageCount); }}>
        {currentPage + 1}/{pageCount} ›
      </button>}
    </div>
    </>
  );
}
