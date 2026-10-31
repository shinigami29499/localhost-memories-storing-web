import { useEffect, useRef, useState } from "react";
import { Marker } from "react-map-gl/mapbox";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { Home } from "../../../components/animate-ui/icons/home";
import { ConfirmationDialog, showToast } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { useAuthStore } from "../../../store/authStore";
import { useHomeLocation } from "../hooks/useHomeLocation";
import type { HomeLocation } from "../types";

interface Props {
  location: HomeLocation;
  variant: "food" | "locations";
  onClick: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

type Action = { type: "remove" } | { type: "move"; location: HomeLocation };

export function HomeLocationMarker({ location, variant, onClick, onHoverChange }: Props) {
  const { t } = useLocale();
  const userId = useAuthStore((state) => state.user?.id);
  const home = useHomeLocation(userId);
  const [action, setAction] = useState<Action | null>(null);
  const [markerVersion, setMarkerVersion] = useState(0);
  const gestureVersion = useRef(0);
  const dialogOpen = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const blocked = home.save.isPending || home.clear.isPending || action !== null;

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
  const openAction = (nextAction: Action) => {
    if (blocked || dialogOpen.current || markerVersion !== gestureVersion.current) return;
    dialogOpen.current = true;
    resetGesture();
    setAction(nextAction);
  };
  const requestRemoval = () => openAction({ type: "remove" });
  const closeAction = () => {
    resetGesture();
    setAction(null);
    dialogOpen.current = false;
  };
  const confirm = async () => {
    if (action?.type === "move") {
      await home.save.mutateAsync(action.location);
      showToast.success(t("Home location saved."));
    } else if (action?.type === "remove") {
      await home.clear.mutateAsync();
      showToast.success(t("Home location removed."));
    }
  };
  const position = action?.type === "move" ? action.location : location;

  return (
    <>
      <Marker
        key={markerVersion}
        latitude={position.latitude}
        longitude={position.longitude}
        anchor="bottom"
        style={{ zIndex: 21 }}
        draggable={!blocked}
        onClick={(event) => event.originalEvent.stopPropagation()}
        onDragStart={() => {
          if (blocked || dialogOpen.current || markerVersion !== gestureVersion.current) return;
          cancelHold();
          suppressClick.current = true;
        }}
        onDragEnd={(event) => {
          if (blocked || dialogOpen.current || markerVersion !== gestureVersion.current) return;
          cancelHold();
          suppressClick.current = true;
          const point = event.lngLat.wrap();
          openAction({ type: "move", location: { latitude: point.lat, longitude: point.lng } });
        }}
      >
        <div className={`${variant}__marker home-location-marker`}
          onPointerEnter={() => onHoverChange?.(true)}
          onPointerLeave={() => onHoverChange?.(false)}
          onFocus={() => onHoverChange?.(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onHoverChange?.(false); }}>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className={variant === "food" ? "food__home-pin" : "locations__home-pin"}
              style={variant === "food" ? { color: "#fff" } : undefined}
              aria-label={t("Home location")}
              title={t("Drag to move home. Hold or right-click to remove.")}
              aria-haspopup="dialog"
              onPointerDown={(event) => {
                if (event.button !== 0 || !event.isPrimary || blocked
                  || dialogOpen.current || markerVersion !== gestureVersion.current) return;
                cancelHold();
                suppressClick.current = false;
                pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
                holdTimer.current = setTimeout(requestRemoval, 600);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                // Touch browsers can emit contextmenu while a hold is still becoming a drag.
                if (event.button === 2 || (!pointer.current && !suppressClick.current)) requestRemoval();
              }}
              onKeyDown={(event) => {
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
                  && !suppressClick.current) onClick();
              }}
            >
              {variant === "food"
                ? <span aria-hidden="true"><Home size={18} /></span>
                : <Home size={18} aria-hidden="true" />}
            </button>
          </AnimateIcon>
        </div>
      </Marker>
      {action && (
        <ConfirmationDialog
          title={action.type === "remove" ? "Remove your home location?" : "Change your home location?"}
          danger={action.type === "remove"}
          onConfirm={confirm}
          onClose={closeAction}
        >
          <p>{action.type === "remove"
            ? t("The home marker will be removed. You can set it again later.")
            : t("Your home marker will move to {latitude}, {longitude}.", {
              latitude: action.location.latitude.toFixed(6),
              longitude: action.location.longitude.toFixed(6),
            })}</p>
        </ConfirmationDialog>
      )}
    </>
  );
}
