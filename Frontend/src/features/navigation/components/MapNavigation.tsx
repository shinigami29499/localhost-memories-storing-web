import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Layer, Marker, Source, useMap } from "react-map-gl/mapbox";
import { Button } from "../../../components/ui";
import { useAnimateIconContext } from "../../../components/animate-ui/icons/icon";
import { XIcon } from "../../../components/animate-ui/icons/x";
import { Compass } from "../../../components/animate-ui/icons/compass";
import { Pencil } from "../../../components/animate-ui/icons/pencil";
import { Plus } from "../../../components/animate-ui/icons/plus";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useNavigation } from "../hooks/useNavigation";
import type { Coordinate, NavigationDestination } from "../services/directionsService";
import { GoogleMapsLink, NavigationModeSelect } from "./NavigationOptions";
import { distanceBetween, routeProgress } from "../utils/routeProgress";
import "./mapNavigation.css";

function getNavigationPortal() {
  return document.querySelector<HTMLElement>(".app-shell") ?? document.body;
}

function NavigationActionIcon({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const { controls } = useAnimateIconContext();
  const previouslyEnabled = useRef(false);
  const pendingAnimation = useRef(false);

  useEffect(() => {
    if (enabled && !previouslyEnabled.current) pendingAnimation.current = true;
    if (!enabled && previouslyEnabled.current && controls) controls.set("initial");
    if (enabled && controls && pendingAnimation.current) {
      pendingAnimation.current = false;
      controls.set("initial");
      void controls.start("animate");
    }
    previouslyEnabled.current = enabled;
  }, [enabled, controls]);

  return <span>{children}</span>;
}

interface Props {
  destination: NavigationDestination;
  accessToken: string;
  homeLocation?: Coordinate | null;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  editAction?: "edit" | "add";
  onCancel?: () => void;
}

export function NavigationToolbar({ onEdit, onNavigate, onCancel, editAction = "edit" }: {
  onEdit?: () => void;
  onNavigate?: () => void;
  onCancel?: () => void;
  editAction?: "edit" | "add";
}) {
  const { t } = useLocale();
  const editLabel = editAction === "add" ? "Add" : "Edit";
  return (
    <div className="map-navigation__toolbar">
      <Button type="button" variant="ghost" aria-label={t(editLabel)} title={t(editLabel)} disabled={!onEdit} onClick={onEdit}>
        <NavigationActionIcon enabled={!!onEdit} key={`${onEdit ? "enabled" : "disabled"}-${editAction}`}>
          {editAction === "add" ? <Plus size={20} aria-hidden="true" /> : <Pencil size={20} aria-hidden="true" />}
        </NavigationActionIcon>
        <span className="map-navigation__desktop-label">{t(editLabel)}</span>
      </Button>
      <span className="map-navigation__divider" aria-hidden="true" />
      <Button type="button" variant="ghost" className="map-navigation__trigger" disabled={!onNavigate} onClick={onNavigate}>
        <NavigationActionIcon enabled={!!onNavigate} key={onNavigate ? "enabled" : "disabled"}>
          <Compass size={22} aria-hidden="true" />
        </NavigationActionIcon> {t("Navigate")}
      </Button>
      <span className="map-navigation__divider" aria-hidden="true" />
      <Button type="button" variant="ghost" className="map-navigation__dismiss" aria-label={t("Cancel")} title={t("Cancel")} disabled={!onCancel} onClick={onCancel}>
        <NavigationActionIcon enabled={!!onCancel} key={onCancel ? "enabled" : "disabled"}>
          <XIcon size={20} aria-hidden="true" />
        </NavigationActionIcon><span className="map-navigation__desktop-label">{t("Cancel")}</span>
      </Button>
    </div>
  );
}

export function DisabledNavigationToolbar() {
  const { t } = useLocale();
  return createPortal(
    <section className="map-navigation" aria-label={t("Navigation")} data-expanded={false}><NavigationToolbar /></section>,
    getNavigationPortal(),
  );
}

export function MapNavigation({ destination, accessToken, homeLocation, onOpenChange, onEdit, editAction, onCancel }: Props) {
  const { t, language } = useLocale();
  // Changing the destination or language must cancel requests and release the GPS watch.
  return <NavigationSession
    key={`${destination.latitude}:${destination.longitude}:${language}:${accessToken}`}
    destination={destination} accessToken={accessToken} homeLocation={homeLocation}
    onOpenChange={onOpenChange} name={t("Navigation")}
    onEdit={onEdit} editAction={editAction} onCancel={onCancel}
  />;
}

function NavigationSession({ destination, accessToken, homeLocation, onOpenChange, onEdit, editAction, onCancel, name }: Props & { name: string }) {
  const { t, language } = useLocale();
  const { current: map } = useMap();
  const mobile = useMediaQuery("(max-width: 640px)");
  const navigation = useNavigation(destination, accessToken, language, homeLocation);
  const { route, position, tracking, loading, locating, arrived, error } = navigation;
  const [expanded, setExpanded] = useState(false);
  const restoreFocus = useRef(false);
  const id = useId();
  const sourceId = `navigation-${id}`;
  const geometry = useMemo(() => route ? {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: route.coordinates },
  } : null, [route]);
  const progress = useMemo(() => route && position ? routeProgress(route, position) : null, [route, position]);
  const busy = loading || locating;
  const gpsUnreliable = tracking && navigation.gpsUnreliable;
  const endpoint = route?.coordinates[route.coordinates.length - 1];
  const destinationGap = endpoint
    ? distanceBetween({ longitude: endpoint[0], latitude: endpoint[1] }, destination) : 0;
  const arrivalGap = position ? distanceBetween(position, destination) : 0;
  const formatDistance = (meters: number) => meters >= 1000
    ? t("{distance} km", { distance: (meters / 1000).toFixed(1) })
    : t("{distance} m", { distance: Math.round(meters) });
  const formatDuration = (seconds: number) => t("{minutes} min", { minutes: Math.max(1, Math.ceil(seconds / 60)) });

  useEffect(() => {
    onOpenChange(expanded);
    if (!expanded && restoreFocus.current) {
      restoreFocus.current = false;
      getNavigationPortal().querySelector<HTMLButtonElement>(".map-navigation__trigger")?.focus();
    }
  }, [expanded, onOpenChange]);
  useEffect(() => () => onOpenChange(false), [onOpenChange]);

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
      duration: 0,
    });
  }, [map, route, mobile]);

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
            paint={{ "line-color": "#ffffff", "line-width": 9 }} />
          <Layer id={`${sourceId}-route`} type="line" slot="top"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{ "line-color": "#1769d2", "line-width": 5 }} />
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
      {createPortal(<div className="map-navigation" data-expanded="false"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}>
          <NavigationToolbar onEdit={onEdit} editAction={editAction}
            onNavigate={() => expanded ? close() : setExpanded(true)} onCancel={onCancel} />
        </div>, getNavigationPortal())}
      {expanded && <section className="map-navigation" aria-label={name} data-expanded="true"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
          <>
            <NavigationModeSelect mode={navigation.mode} disabled={tracking || busy} onChange={navigation.setMode} />
            {navigation.usingHomeOrigin && (
              <p className="map-navigation__hint">
                {t("Could not determine your current location. This route starts at your saved home location. The selected provider receives it and your destination.")}
              </p>
            )}
            <div className="map-navigation__actions">
              <GoogleMapsLink destination={destination} mode={navigation.mode}
                origin={navigation.usingHomeOrigin ? homeLocation ?? undefined : undefined}
                onOpen={navigation.stop} />
              {!tracking && (
                <Button type="button" variant="secondary" busy={busy} onClick={navigation.preview}>
                  {t(locating ? "Finding your location…" : loading ? "Loading route…" : "Preview with Mapbox")}
                </Button>
              )}
            </div>
            {error && <p role="alert">{t(error)}</p>}
            {gpsUnreliable && <p role="status">{t("Waiting for a reliable GPS signal. Guidance is paused.")}</p>}
            {route && (
              <>
                <p className="map-navigation__summary">
                  {formatDistance(arrived ? (arrivalGap > 35 ? arrivalGap : 0)
                    : tracking && progress ? progress.remaining : route.distance)}
                  {" · "}
                  {arrived ? t("Route complete") : formatDuration(tracking && progress ? progress.duration : route.duration)}
                </p>
                <div role="status" aria-live="polite">
                  {arrived ? arrivalGap > 35
                    ? t("Route complete. Destination is {distance} away.", { distance: formatDistance(arrivalGap) })
                    : t("You have arrived at your destination.")
                    : loading ? t("Recalculating route…")
                      : tracking && !gpsUnreliable && progress?.instruction && (
                        <p>{progress.instruction} {t("in {distance}", { distance: formatDistance(progress.nextTurnDistance) })}</p>
                      )}
                </div>
                {!arrived && destinationGap > 35 && (
                  <p className="map-navigation__hint">
                    {t("Route ends {distance} from the destination.", { distance: formatDistance(destinationGap) })}
                  </p>
                )}
                {!arrived && (
                  tracking ? (
                    <Button type="button" variant="secondary" onClick={navigation.stop}>{t("Stop navigation")}</Button>
                  ) : null
                )}
                <details className="map-navigation__steps">
                  <summary>{t("Turn-by-turn directions")}</summary>
                  <ol>{route.steps.map((step, index) => (
                    <li key={index}>{step.instruction} <small>{formatDistance(step.distance)}</small></li>
                  ))}</ol>
                </details>
                <p className="map-navigation__hint">
                  {t("Keep this page open for GPS guidance and rerouting. Follow road signs and local traffic rules.")}
                </p>
              </>
            )}
          </>
      </section>}
    </>
  );
}
