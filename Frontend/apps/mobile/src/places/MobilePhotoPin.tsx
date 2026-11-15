import { Camera } from "@/components/animate-ui/icons/camera";
import { usePhotoPinController, type PhotoPinProps } from "@/features/locations/components/LocationMapShared";

export function MobilePhotoPin(props: PhotoPinProps) {
  const { item, selected, movable, onSelect, onMove, onDragChange } = props;
  const { map, animateMarker, pinRef, offset, cancelGesture, handlePointerDown, handlePointerMove, handlePointerUp, handleClick } = usePhotoPinController(props);

  return (
    <button ref={pinRef} type="button" className="map-marker__pin locations__pin" title={item.originalFilename}
      data-marker-motion={animateMarker}
      aria-label={item.originalFilename} aria-pressed={selected}
      data-movable={movable}
      style={{ translate: `${offset.x}px ${offset.y}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onLostPointerCapture={cancelGesture}
      onPointerCancel={cancelGesture}
      onClick={handleClick}>
      <span className="map-marker__center" aria-hidden="true"><Camera size={20} /></span>
    </button>
  );
}
