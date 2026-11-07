import { useEffect, useRef, useState } from "react";
import { Marker, useMap } from "react-map-gl/mapbox";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { Home } from "../../../components/animate-ui/icons/home";
import { ConfirmationDialog, showToast } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { useAuthStore } from "../../../store/authStore";
import { useHomeLocation } from "../hooks/useHomeLocation";
import { useMarkerDrag } from "../hooks/useMarkerDrag";
import type { HomeLocation } from "../types";

interface Props {
  location: HomeLocation;
  variant: "place" | "locations";
  onClick: () => void;
  onHoverChange?: (hovered: boolean) => void;
  onSelectionChange?: (selected: boolean) => void;
  onDragChange?: (dragging: boolean) => void;
  onRelocate?: (location: HomeLocation) => void;
}

export function HomeLocationMarker({ location, variant, onClick, onHoverChange, onSelectionChange, onDragChange, onRelocate }: Props) {
  const { current: map } = useMap();
  const [screenY, setScreenY] = useState(0);
  const { t } = useLocale();
  const userId = useAuthStore((state) => state.user?.id);
  const home = useHomeLocation(userId);
  const [removing, setRemoving] = useState(false);
  const [selected, setSelected] = useState(false);
  const selectHome = (nextSelected: boolean) => {
    setSelected(nextSelected);
    onSelectionChange?.(nextSelected);
  };
  const [markerVersion, setMarkerVersion] = useState(0);
  const gestureVersion = useRef(0);
  const dialogOpen = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const wasDragging = useRef(false);
  const blocked = home.save.isPending || home.clear.isPending || removing;

  const cancelHold = () => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    pointer.current = null;
  };

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const start = pointer.current;
      if (start && start.id === event.pointerId
        && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
        suppressClick.current = true;
        cancelHold();
      }
    };
    const end = (event: PointerEvent) => {
      if (pointer.current?.id === event.pointerId) cancelHold();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
    window.addEventListener("blur", cancelHold);
    return () => {
      cancelHold();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", end);
      document.removeEventListener("pointercancel", end);
      window.removeEventListener("blur", cancelHold);
    };
  }, []);

  const resetGesture = () => {
    cancelHold();
    suppressClick.current = true;
    // Replace the Mapbox marker to discard its native pending drag listeners.
    gestureVersion.current += 1;
    setMarkerVersion(gestureVersion.current);
  };
  const requestRemoval = () => {
    if (blocked || dialogOpen.current || markerVersion !== gestureVersion.current) return;
    dialogOpen.current = true;
    resetGesture();
    setRemoving(true);
  };
  const closeAction = () => {
    resetGesture();
    setRemoving(false);
    dialogOpen.current = false;
  };
  const position = location;
  useEffect(() => {
    if (!map || typeof map.project !== "function") return;
    const update = () => setScreenY(map.project([position.longitude, position.latitude]).y);
    update();
    map.on("move", update);
    map.on("resize", update);
    return () => { map.off("move", update); map.off("resize", update); };
  }, [map, position.latitude, position.longitude]);
  const drag = useMarkerDrag(position, (nextLocation) => {
    cancelHold();
    suppressClick.current = true;
    onDragChange?.(false);
    resetGesture();
    selectHome(false);
    onRelocate?.(nextLocation);
  }, !blocked, 180);

  useEffect(() => {
    const dragging = drag.offset.x !== 0 || drag.offset.y !== 0;
    if (dragging !== wasDragging.current) {
      wasDragging.current = dragging;
      onDragChange?.(dragging);
    }
  }, [drag.offset.x, drag.offset.y, onDragChange]);

  useEffect(() => {
    const deselectOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && !drag.ref.current?.closest(".home-location-marker")?.contains(event.target)) selectHome(false);
    };
    document.addEventListener("click", deselectOutside, true);
    return () => document.removeEventListener("click", deselectOutside, true);
  }, [drag.ref, onSelectionChange]);

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
              onPointerDown={(event) => {
                if (event.button !== 0 || !event.isPrimary || blocked
                  || dialogOpen.current || markerVersion !== gestureVersion.current) return;
                drag.onPointerDown(event);
                cancelHold();
                suppressClick.current = false;
                pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
                holdTimer.current = setTimeout(requestRemoval, 600);
              }}
              onPointerMove={drag.onPointerMove}
              onPointerUp={drag.onPointerUp}
              onPointerCancel={drag.onPointerCancel}
              onLostPointerCapture={drag.onLostPointerCapture}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                // Touch browsers can emit contextmenu while a hold is still becoming a drag.
                if (event.button === 2 || (!pointer.current && !suppressClick.current)) requestRemoval();
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") selectHome(false);
                if ((event.key === "Enter" || event.key === " ") && !blocked && !dialogOpen.current)
                  suppressClick.current = false;
                if (event.key === "Delete" || event.key === "Backspace") {
                  event.preventDefault();
                  requestRemoval();
                }
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (!blocked && !dialogOpen.current && markerVersion === gestureVersion.current
                  && !suppressClick.current && !drag.suppressClick.current) {
                  selectHome(true);
                  onClick();
                }
              }}
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
          onConfirm={async () => { await home.clear.mutateAsync(); showToast.delete(t("Home location removed.")); }}
          onClose={closeAction}
        >
          <p>{t("The home marker will be removed. You can set it again later.")}</p>
        </ConfirmationDialog>
      )}
    </>
  );
}
