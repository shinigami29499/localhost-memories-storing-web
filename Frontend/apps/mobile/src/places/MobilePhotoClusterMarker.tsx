import type { CSSProperties } from "react";
import { Marker } from "react-map-gl/mapbox";
import { usePhotoClusterMarkerController, type PhotoClusterMarkerProps } from "@/features/locations/components/LocationMapShared";
import { photoMarkerColor } from "@/features/locations/components/LocationMapShared";
import { MobilePhotoMarkerItem as PhotoMarkerItem } from "./MobilePhotoMarkerItem";

export function MobilePhotoClusterMarker(props: PhotoClusterMarkerProps) {
  const { cluster, shadowLocation, selected, onSelect, canMove, onMove, onDragChange, homeExpanded, nearHome, onHomeHoverChange, onActiveChange, hidePreview, hideCount, MarkerPreview, PinComponent } = props;
  const { t, open, setOpen, setPage, count, selectedIndex, pageCount, currentPage, fanned, expanded, step } = usePhotoClusterMarkerController(props);

  return (
    <>
    <Marker latitude={shadowLocation.latitude} longitude={shadowLocation.longitude} anchor="bottom" style={{ zIndex: 0, pointerEvents: "none" }}>
      <div className={`locations__cluster${count > 1 ? " locations__cluster--group" : ""}`} data-open={expanded} data-home-expanded={homeExpanded} data-near-home={nearHome}
        style={{ "--fan-count": fanned.length, "--fan-step": `${step}deg` } as CSSProperties} aria-hidden="true">
        {fanned.map((item, index) => item.location && <span key={item.id} className="map-marker__shadow locations__cluster-shadow"
          style={{ "--fan-index": index, "--marker-color": photoMarkerColor(item.id) } as CSSProperties} />)}
      </div>
    </Marker>
    <div
      className={`locations__cluster${count > 1 ? " locations__cluster--group" : ""}`}
      data-open={expanded}
      data-home-expanded={homeExpanded}
      data-near-home={nearHome}
      data-selected={selectedIndex >= 0}
      style={{ "--fan-count": fanned.length, "--fan-step": `${step}deg`, "--counter-color": "#000" } as CSSProperties}
      onPointerEnter={() => { setOpen(true); onActiveChange?.(true); onHomeHoverChange?.(true); }}
      onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) { setOpen(false); onActiveChange?.(false); onHomeHoverChange?.(false); } }}
      onFocus={() => { setOpen(true); onActiveChange?.(true); onHomeHoverChange?.(true); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(":hover")) { setOpen(false); onActiveChange?.(false); onHomeHoverChange?.(false); } }}
    >
      {fanned.map((item, index) => item.location && (
        <PhotoMarkerItem key={item.id} item={item} index={index} selected={selected?.id === item.id}
          canMove={canMove} onSelect={onSelect} onMove={onMove} onDragChange={onDragChange} hidePreview={hidePreview} MarkerPreview={MarkerPreview} PinComponent={PinComponent} />
      ))}
      {count > 1 && !hideCount && (
        <span className="locations__cluster-count" aria-label={t("{count} photos here", { count })}>{count}</span>
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
