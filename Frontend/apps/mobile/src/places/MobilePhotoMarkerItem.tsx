import { useState, type CSSProperties } from "react";
import { photoMarkerColor, type PhotoMarkerItemProps } from "@/features/locations/components/LocationMapShared";
import { MobilePhotoPin as PhotoPin } from "./MobilePhotoPin";
import { MobilePhotoMarkerPreview as PhotoMarkerPreview } from "./MobilePhotoMarkerPreview";

export function MobilePhotoMarkerItem({ item, index, selected, canMove, onSelect, onMove, onDragChange, hidePreview, MarkerPreview = PhotoMarkerPreview, PinComponent = PhotoPin }: PhotoMarkerItemProps) {
  const [hovered, setHovered] = useState(false);
  return <div className="map-marker locations__marker" data-selected={selected}
    style={{ "--fan-index": index, "--marker-color": photoMarkerColor(item.id) } as CSSProperties}
    onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
    onFocus={() => setHovered(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}>
    <PinComponent item={item} selected={selected} movable={canMove(item)} onSelect={onSelect} onMove={onMove} onDragChange={onDragChange} />
    {!hidePreview && (hovered || selected) && <article className="locations__popup" aria-label={item.originalFilename}>
      <MarkerPreview item={item} />
    </article>}
  </div>;
}
