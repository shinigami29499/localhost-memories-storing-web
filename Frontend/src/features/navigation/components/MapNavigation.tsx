import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { Layer, Marker, Source, useMap } from "react-map-gl/mapbox";
import { Button } from "../../../components/ui";
import { PageActionButton } from "../../../components/layout/PageActionButton";
import { PageActionBar } from "../../../components/layout/PageActionBar";
import { AnimateIcon, AnimatedAction, useAnimateIconOnChange } from "../../../components/animate-ui/icons/icon";
import { XIcon } from "../../../components/animate-ui/icons/x";
import { Compass } from "../../../components/animate-ui/icons/compass";
import { Pencil } from "../../../components/animate-ui/icons/pencil";
import { Plus } from "../../../components/animate-ui/icons/plus";
import { Check } from "../../../components/animate-ui/icons/check";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useNavigation } from "../hooks/useNavigation";
import type { Coordinate, NavigationDestination } from "../services/directionsService";
import { GoogleMapsLink } from "./NavigationOptions";
import "../../../pages/gallery/gallery.css";
import "./mapNavigation.css";

function getNavigationPortal() {
  return document.querySelector<HTMLElement>(".app-shell") ?? document.body;
}

interface Props {
  destination: NavigationDestination;
  accessToken: string;
  homeLocation?: Coordinate | null;
  onOpenChange: (open: boolean) => void;
  onMapboxPreviewChange?: (previewing: boolean) => void;
  onEdit?: () => void;
  editAction?: "edit" | "add" | "confirm";
  onCancel?: () => void;
}

export function NavigationToolbar({ onEdit, onNavigate, onCancel, editAction = "edit" }: {
  onEdit?: () => void;
  onNavigate?: () => void;
  onCancel?: () => void;
  editAction?: "edit" | "add" | "confirm";
}) {
  const { t } = useLocale();
  const editLabel = editAction === "add" ? "Add" : editAction === "confirm" ? "Confirm" : "Edit";
  const actionAnimationRevision = useAnimateIconOnChange(
    `${editAction}:${Boolean(onEdit)}:${Boolean(onNavigate)}:${Boolean(onCancel)}`,
    true,
  );
  return (
    <PageActionBar className="map-navigation__toolbar" role="group" aria-label={t("Navigation")}>
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <PageActionButton aria-label={t(editLabel)} title={t(editLabel)} disabled={!onEdit} onClick={onEdit}>
          <AnimatedAction animationRevision={actionAnimationRevision}>
            {editAction === "add" ? <Plus size={20} aria-hidden="true" /> : editAction === "confirm" ? <Check size={20} aria-hidden="true" /> : <Pencil size={20} aria-hidden="true" />}
          </AnimatedAction>
        </PageActionButton>
      </AnimateIcon>
      <span className="gallery-selection-bar__divider" aria-hidden="true" />
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <PageActionButton className="map-navigation__trigger" disabled={!onNavigate} onClick={onNavigate}>
          <AnimatedAction animationRevision={actionAnimationRevision}><Compass size={22} aria-hidden="true" /></AnimatedAction> {t("Navigate")}
        </PageActionButton>
      </AnimateIcon>
      <span className="gallery-selection-bar__divider" aria-hidden="true" />
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <PageActionButton className="map-navigation__dismiss" aria-label={t("Cancel")} title={t("Cancel")} disabled={!onCancel} onClick={onCancel}>
          <AnimatedAction animationRevision={actionAnimationRevision}><XIcon size={20} aria-hidden="true" /></AnimatedAction>
        </PageActionButton>
      </AnimateIcon>
    </PageActionBar>
  );
}

export function DisabledNavigationToolbar() {
  return <NavigationToolbar />;
}

export function MapNavigation({ destination, accessToken, homeLocation, onOpenChange, onMapboxPreviewChange, onEdit, editAction, onCancel }: Props) {
  const { t, language } = useLocale();
  // Changing the destination or language must cancel requests and release the GPS watch.
  return <NavigationSession
    key={`${destination.latitude}:${destination.longitude}:${language}:${accessToken}`}
    destination={destination} accessToken={accessToken} homeLocation={homeLocation}
    onOpenChange={onOpenChange} name={t("Navigation")}
    onMapboxPreviewChange={onMapboxPreviewChange}
    onEdit={onEdit} editAction={editAction} onCancel={onCancel}
  />;
}

function NavigationSession({ destination, accessToken, homeLocation, onOpenChange, onMapboxPreviewChange, onEdit, editAction, onCancel, name }: Props & { name: string }) {
  const { t, language } = useLocale();
  const { current: map } = useMap();
  const mobile = useMediaQuery("(max-width: 640px)");
  const shouldReduceMotion = useShouldReduceMotion();
  const navigation = useNavigation(destination, accessToken, language, homeLocation);
  const { route, position, tracking, loading, locating, error } = navigation;
  const [expanded, setExpanded] = useState(false);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const restoreFocus = useRef(false);
  const id = useId();
  const sourceId = `navigation-${id}`;
  const geometry = useMemo(() => route ? {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: route.coordinates },
  } : null, [route]);
  const busy = loading || locating;
  const gpsUnreliable = tracking && navigation.gpsUnreliable;

  useEffect(() => {
    onOpenChangeRef.current(expanded);
    if (!expanded && restoreFocus.current) {
      restoreFocus.current = false;
      getNavigationPortal().querySelector<HTMLButtonElement>(".map-navigation__trigger")?.focus();
    }
  }, [expanded]);
  useEffect(() => () => onOpenChangeRef.current(false), []);
  useEffect(() => {
    onMapboxPreviewChange?.(navigation.mapboxPreview);
  }, [navigation.mapboxPreview, onMapboxPreviewChange]);
  useEffect(() => () => onMapboxPreviewChange?.(false), [onMapboxPreviewChange]);

  useEffect(() => {
    if (!map || !route) return;
    const first = route.coordinates[0];
    let west = first[0], east = first[0], south = first[1], north = first[1];
    for (const [longitude, latitude] of route.coordinates) {
      // Frame the short crossing rather than the whole world at the antimeridian.
      const wrapped = first[0] + ((longitude - first[0] + 540) % 360) - 180;
      west = Math.min(west, wrapped);
      east = Math.max(east, wrapped);
      south = Math.min(south, latitude);
      north = Math.max(north, latitude);
    }
    const width = map.getContainer().clientWidth;
    map.fitBounds([[west, south], [east, north]], {
      padding: mobile
        ? { top: 72, bottom: Math.round(map.getContainer().clientHeight * 0.48), left: 32, right: 48 }
        : { top: 72, bottom: 64, left: Math.min(360, Math.round(width * 0.45)), right: 64 },
      maxZoom: 16,
      pitch: 0,
      bearing: 0,
      duration: shouldReduceMotion ? 0 : 400,
    });
  }, [map, route, mobile, shouldReduceMotion]);

  useEffect(() => {
    if (!map || !tracking || !position || gpsUnreliable) return;
    if (position.accuracy > 100 || Date.now() - position.timestamp > 30000) return;
    map.easeTo({
      center: [position.longitude, position.latitude],
      zoom: 16,
      pitch: 0,
      bearing: position.heading !== null && Number.isFinite(position.heading) ? position.heading : 0,
      padding: mobile
        ? { top: 64, bottom: Math.round(map.getContainer().clientHeight * 0.46), left: 16, right: 48 }
        : { top: 64, bottom: 64, left: Math.min(360, Math.round(map.getContainer().clientWidth * 0.45)), right: 64 },
      retainPadding: false,
      duration: 0,
    });
  }, [map, tracking, position, mobile, gpsUnreliable]);

  const close = () => {
    navigation.reset();
    restoreFocus.current = true;
    setExpanded(false);
  };
  return (
    <>
      {geometry && (
        <Source id={sourceId} type="geojson" data={geometry}>
          <Layer id={`${sourceId}-outline`} type="line" slot="top"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{ "line-color": "#F4F3EE", "line-width": 9 }} />
          <Layer id={`${sourceId}-route`} type="line" slot="top"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{ "line-color": "#6A3F36", "line-width": 5 }} />
        </Source>
      )}
      {position && (
        <Marker latitude={position.latitude} longitude={position.longitude} anchor="center"
          onClick={(event) => event.originalEvent.stopPropagation()}>
          <span className="map-navigation__position" role="img" aria-label={t("Your current location")} />
        </Marker>
      )}
      {route && (
        <Marker latitude={destination.latitude} longitude={destination.longitude} anchor="bottom"
          onClick={(event) => event.originalEvent.stopPropagation()}>
          <span className="map-navigation__destination" role="img" aria-label={destination.name} />
        </Marker>
      )}
      <NavigationToolbar onEdit={onEdit} editAction={editAction}
        onNavigate={() => expanded ? close() : setExpanded(true)} onCancel={onCancel} />
      {expanded && <section className="map-navigation" aria-label={name} data-expanded="true"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
          <>
            <div className="map-navigation__actions">
              <GoogleMapsLink destination={destination} mode="driving"
                origin={navigation.usingHomeOrigin ? homeLocation ?? undefined : undefined}
                onOpen={navigation.stop} />
              {!tracking && (
                <Button type="button" variant="secondary" busy={busy} aria-pressed={navigation.mapboxPreview} onClick={navigation.preview}>
                  {t(locating ? "Finding your locationâ€¦" : loading ? "Loading routeâ€¦" : "Preview with Mapbox")}
                </Button>
              )}
            </div>
            {error && <p role="alert">{t(error)}</p>}
            {gpsUnreliable && <p role="status">{t("Waiting for a reliable GPS signal. Guidance is paused.")}</p>}
          </>
      </section>}
    </>
  );
}
