import { useEffect, useRef, useState } from "react";
import { Marker, useMap } from "react-map-gl/mapbox";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Home } from "@/components/animate-ui/icons/home";
import { showToast } from "@/components/ui";
import { MobileConfirmationDialog as ConfirmationDialog } from "../gallery/MobileConfirmationDialog";
import { useLocale } from "@/context/LocaleContext";
import { useAuthStore } from "@/store/authStore";
import { useHomeLocation } from "@/features/locations/hooks/useHomeLocation";
import { useMarkerDrag } from "@/features/locations/hooks/useMarkerDrag";
import type { HomeLocation } from "@/features/locations/types";

interface Props {
  location: HomeLocation;
  variant: "place" | "locations";
  onClick: () => void;
  onHoverChange?: (hovered: boolean) => void;
  onSelectionChange?: (selected: boolean) => void;
  onDragChange?: (dragging: boolean) => void;
  onRelocate?: (location: HomeLocation) => void;
}

import { useHomeMarkerController } from "@/features/locations/components/useHomeMarkerController";

export function MobileHomeLocationMarker(props: Props) {
  const { location, variant, onClick, onHoverChange, onSelectionChange, onDragChange, onRelocate } = props;
  const { map, screenY, t, home, removing, selected, markerVersion, closeAction, position, drag, handlePointerDown, handleContextMenu, handleKeyDown, handleClick, confirmRemoval } = useHomeMarkerController(props);

  return (
    <>
      <Marker latitude={position.latitude} longitude={position.longitude} anchor="bottom" style={{ zIndex: 0, pointerEvents: "none" }}>
        <div className="map-shadow-layer" aria-hidden="true"><span className="map-marker__shadow home-location-shadow" style={{ translate: `${drag.offset.x}px ${drag.offset.y}px` }} /></div>
      </Marker>
      <Marker
        key={markerVersion}
        latitude={position.latitude}
        longitude={position.longitude}
        anchor="bottom"
        style={{ zIndex: Math.round(screenY * 10) + 100000 }}
      >
        <div className={`${variant}__marker home-location-marker map-marker`}
          style={{ translate: `${drag.offset.x}px ${drag.offset.y}px` }}
          onPointerEnter={() => onHoverChange?.(true)}
          onPointerLeave={() => onHoverChange?.(false)}
          onFocus={() => onHoverChange?.(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onHoverChange?.(false); }}>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              ref={drag.ref}
              type="button"
              className={`map-marker__pin ${variant === "place" ? "place__home-pin" : "locations__home-pin"}`}
              aria-label={t("Home location")}
              aria-pressed={selected}
              title={t("Hold briefly, then drag to move home. Hold longer or right-click to remove.")}
              aria-haspopup="dialog"
              onPointerDown={handlePointerDown}
              onPointerMove={drag.onPointerMove}
              onPointerUp={drag.onPointerUp}
              onPointerCancel={drag.onPointerCancel}
              onLostPointerCapture={drag.onLostPointerCapture}
              onContextMenu={handleContextMenu}
              onKeyDown={handleKeyDown}
              onClick={handleClick}
            >
              <span className="map-marker__center" aria-hidden="true"><Home size={22} /></span>
            </button>
          </AnimateIcon>
        </div>
      </Marker>
      {removing && (
        <ConfirmationDialog
          title="Remove your home location?"
          confirmLabel="Remove home location"
          danger
          onConfirm={confirmRemoval}
          onClose={closeAction}
        >
          <p>{t("The home marker will be removed. You can set it again later.")}</p>
        </ConfirmationDialog>
      )}
    </>
  );
}
