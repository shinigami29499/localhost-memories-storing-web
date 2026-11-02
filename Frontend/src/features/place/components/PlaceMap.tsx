import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Map, { GeolocateControl, Marker, useMap, type MapRef } from "react-map-gl/mapbox";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import "mapbox-gl/dist/mapbox-gl.css";
import "../../locations/components/mapControls.css";
import { ErrorState, showToast } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { Globe } from "../../../components/animate-ui/icons/globe";
import { Home } from "../../../components/animate-ui/icons/home";
import { Settings } from "../../../components/animate-ui/icons/settings";
import { ChevronDown } from "../../../components/animate-ui/icons/chevron-down";
import { SlidersHorizontal } from "../../../components/animate-ui/icons/sliders-horizontal";
import { Key } from "../../../components/animate-ui/icons/key";
import { Plus } from "../../../components/animate-ui/icons/plus";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAnimationStore } from "../../../store/animationStore";
import { mediaPreviewUrl } from "../../../utils/media";
import {
  clusterMapMarkers,
  mapMarkersOverlap,
  type MapCoordinate,
  type MapMarkerGroup,
  type MapProjector,
} from "../../../utils/mapMarkerGroups";
import {
  getMapAppearanceConfig,
  MapAppearanceConfig,
  MapAppearanceSettings,
  useMapAppearance,
} from "../../locations/components/MapAppearanceSettings";
import { StarRating } from "./StarRating";
import { LocationSearch } from "../../locations/components/LocationSearch";
import { HomeLocationMarker } from "../../locations/components/HomeLocationMarker";
import { MapLoadingOverlay } from "../../locations/components/MapLoadingOverlay";
import { useHomeMarkerHover } from "../../locations/hooks/useHomeMarkerHover";
import type { LocationSearchResult } from "../../locations/services/locationSearchService";
import { findPlaceAt } from "../../locations/utils/findPlaceAt";
import type { HomeLocation } from "../../locations/types";
import type { PlaceCoordinate, Place } from "../types";
import { DisabledNavigationToolbar, MapNavigation } from "../../navigation/components/MapNavigation";
import { MARKER_DRAG_HOLD_MS } from "../../locations/hooks/useMarkerDrag";
import { NavigationFallback } from "../../navigation/components/NavigationOptions";

interface Props {
  places: Place[];
  selectedId: string | null;
  focusZoom?: boolean;
  draft: PlaceCoordinate | null;
  picking: boolean;
  homeLocation: HomeLocation | null;
  homeLocationReady: boolean;
  homePicking: boolean;
  homeActionDisabled: boolean;
  canChange: (place: Place) => boolean;
  onMove: (place: Place, coordinate: PlaceCoordinate) => void;
  onDelete: (place: Place) => void;
  onSelect: (place: Place) => void;
  onEdit: (place: Place) => void;
  onEditDraft: () => void;
  onCancelSelection: () => void;
  onCancelDraft: () => void;
  onPickHome: (coordinate: HomeLocation) => void;
  onCreateAtCurrentLocation: (coordinate: PlaceCoordinate) => void;
  onHomeClick: () => void;
  /** `placeName` is set when the click snapped to a basemap place label. */
  onPick: (coordinate: PlaceCoordinate, placeName?: string, source?: "search") => void;
}

type MapScene = "streets" | "3d";

const MOBILE_PREVIEW_PADDING = { top: 300, bottom: 0, left: 0, right: 0 };

function MapViewport({ places, selected, ready, allowFit, focusZoom }: {
  places: Place[];
  selected: Place | undefined;
  ready: boolean;
  allowFit: boolean;
  focusZoom?: boolean;
}) {
  const { current: map } = useMap();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const fittedCount = useRef(-1);
  const hadSelection = useRef(false);
  useEffect(() => {
    if (selected) hadSelection.current = true;
    if (hadSelection.current) return;
    if (!map || !ready || !allowFit || selected || !places.length) return;
    // Framing runs once per place-count change so editing never moves the camera.
    if (fittedCount.current === places.length) return;
    fittedCount.current = places.length;
    const first = places[0];
    let west = first.longitude, east = first.longitude;
    let south = first.latitude, north = first.latitude;
    for (const place of places) {
      west = Math.min(west, place.longitude);
      east = Math.max(east, place.longitude);
      south = Math.min(south, place.latitude);
      north = Math.max(north, place.latitude);
    }
    map.fitBounds([[west, south], [east, north]], { padding: 64, maxZoom: 16, duration: 0 });
  }, [map, ready, allowFit, places, selected]);

  useEffect(() => {
    if (!map || !ready || !selected) return;
    map.jumpTo({
      center: [selected.longitude, selected.latitude],
      zoom: Math.max(map.getZoom(), focusZoom ? 18 : 13),
      ...(isMobile ? { padding: MOBILE_PREVIEW_PADDING, retainPadding: false } : {}),
    });
  }, [map, ready, selected?.id, selected?.latitude, selected?.longitude, isMobile, focusZoom]);
  return null;
}

function InitialLocationCenter({
  homeLocation,
  homeLocationReady,
  ready,
  onResolved,
}: {
  homeLocation: HomeLocation | null;
  homeLocationReady: boolean;
  ready: boolean;
  onResolved: (hasCenter: boolean) => void;
}) {
  const { current: map } = useMap();
  const resolved = useRef(false);

  useEffect(() => {
    if (!map || !ready || !homeLocationReady || resolved.current) return;
    let cancelled = false;
    const center = (location: HomeLocation) => {
      if (cancelled) return;
      resolved.current = true;
      map.easeTo({ center: [location.longitude, location.latitude], zoom: 14, duration: 0 });
      onResolved(true);
    };
    const fallback = () => {
      if (cancelled) return;
      if (homeLocation) center(homeLocation);
      else {
        resolved.current = true;
        onResolved(false);
      }
    };

    if (homeLocation) {
      center(homeLocation);
      return;
    }

    if (!navigator.geolocation) {
      fallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => center({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      fallback,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
    return () => { cancelled = true; };
  }, [map, ready, homeLocationReady, homeLocation, onResolved]);

  return null;
}

/** Mapbox keeps its canvas size until told otherwise; the panel resizes when the sidebar collapses. */
function MapResizer() {
  const { current: map } = useMap();
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function MapCameraScene({ scene, selected, ready, homeLocation, homeRequest, focusRequest }: {
  scene: MapScene;
  selected: Place | undefined;
  ready: boolean;
  homeLocation: HomeLocation | null;
  homeRequest: number;
  focusRequest: number;
}) {
  const shouldReduceMotion = useShouldReduceMotion();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const { current: map } = useMap();
  const handledHomeRequest = useRef(homeRequest);
  const previousScene = useRef(scene);
  const hasBeenReady = useRef(false);
  const pausedAfterReady = useRef(false);
  useEffect(() => {
    if (!map) return;
    if (!ready) {
      if (hasBeenReady.current) pausedAfterReady.current = true;
      return;
    }
    hasBeenReady.current = true;
    if (pausedAfterReady.current) {
      pausedAfterReady.current = false;
      previousScene.current = scene;
      handledHomeRequest.current = homeRequest;
      return;
    }
    const sceneChanged = previousScene.current !== scene;
    previousScene.current = scene;
    if (homeRequest !== handledHomeRequest.current && homeLocation) {
      handledHomeRequest.current = homeRequest;
      map.easeTo({
        center: [homeLocation.longitude, homeLocation.latitude],
        zoom: Math.max(map.getZoom(), 18),
        pitch: 0,
        bearing: 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
        duration: shouldReduceMotion ? 0 : 400,
      });
      return;
    }
    if (!selected && !sceneChanged) return;
    map.easeTo({
      ...(selected
        ? {
            center: [selected.longitude, selected.latitude] as [number, number],
            zoom: Math.max(map.getZoom(), 18),
          }
        : {}),
      pitch: scene === "3d" && selected ? 55 : 0,
      bearing: scene === "3d" && selected ? -20 : 0,
      duration: shouldReduceMotion ? 0 : 400,
      ...(isMobile && selected ? { padding: MOBILE_PREVIEW_PADDING, retainPadding: false } : {}),
    });
  }, [map, ready, scene, selected?.id, selected?.latitude, selected?.longitude, shouldReduceMotion, isMobile, homeLocation, homeRequest, focusRequest]);
  return null;
}

function PlaceMarker({ place, selected, onSelect, canChange, onMove, onDelete }: {
  place: Place;
  selected: boolean;
  onSelect: (place: Place) => void;
} & Pick<Props, "canChange" | "onMove" | "onDelete">) {
  const { t } = useLocale();
  const animateMarker = useAnimationStore((state) => state.enabled && state.iconsEnabled);
  const { current: map } = useMap();
  const pinRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; startedAt: number; dragging: boolean; cancelled: boolean } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const changeable = canChange(place);
  const cancelHold = useCallback(() => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }, []);
  const cancelGesture = useCallback(() => {
    cancelHold();
    const start = gesture.current;
    if (!start) return;
    gesture.current = null;
    suppressClick.current = true;
    if (pinRef.current?.hasPointerCapture(start.id)) pinRef.current.releasePointerCapture(start.id);
    setOffset({ x: 0, y: 0 });
  }, [cancelHold]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelGesture();
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !pinRef.current?.contains(event.target)) cancelGesture();
    };
    window.addEventListener("keydown", escape, true);
    window.addEventListener("blur", cancelGesture);
    document.addEventListener("pointerdown", outside, true);
    return () => {
      cancelHold();
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("blur", cancelGesture);
      document.removeEventListener("pointerdown", outside, true);
    };
  }, [cancelGesture, cancelHold]);

  useEffect(() => {
    if (!changeable) cancelGesture();
  }, [changeable, cancelGesture]);

  return (
    <div className="place__marker" data-selected={selected} style={{ translate: `${offset.x}px ${offset.y}px`, "--marker-color": place.markerColor } as CSSProperties}>
      <button
        ref={pinRef}
        type="button"
        className="place__pin"
        data-marker-motion={animateMarker}
        data-changeable={changeable}
        title={changeable ? t("Drag to move this place. Hold or right-click to delete.") : place.name}
        aria-label={place.name}
        aria-pressed={selected}
        aria-haspopup="dialog"
        onPointerDown={(event) => {
          suppressClick.current = false;
          if (!changeable || !map || event.button !== 0 || !event.isPrimary) return;
          event.preventDefault();
          event.stopPropagation();
          cancelHold();
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startedAt: performance.now(), dragging: false, cancelled: false };
          event.currentTarget.setPointerCapture(event.pointerId);
          holdTimer.current = setTimeout(() => {
            cancelGesture();
            suppressClick.current = true;
            onDelete(place);
          }, 600);
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (!start || start.id !== event.pointerId) return;
          const x = event.clientX - start.x, y = event.clientY - start.y;
          if (Math.hypot(x, y) > 8) {
            cancelHold();
            if (!start.dragging && performance.now() - start.startedAt < MARKER_DRAG_HOLD_MS) {
              start.cancelled = true;
              suppressClick.current = true;
            } else if (!start.cancelled) start.dragging = true;
          }
          if (start.dragging) setOffset({ x, y });
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          if (!start || start.id !== event.pointerId) return;
          gesture.current = null;
          cancelHold();
          setOffset({ x: 0, y: 0 });
          event.currentTarget.releasePointerCapture(event.pointerId);
          if (!start.dragging || !map || !changeable) return;
          suppressClick.current = true;
          const origin = map.project([place.longitude, place.latitude]);
          const point = map.unproject([
            origin.x + event.clientX - start.x,
            origin.y + event.clientY - start.y,
          ]).wrap();
          onMove(place, { latitude: point.lat, longitude: point.lng });
        }}
        onLostPointerCapture={cancelGesture}
        onPointerCancel={cancelGesture}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (changeable && (event.button === 2 || (!gesture.current && !suppressClick.current))) {
            cancelGesture();
            suppressClick.current = true;
            onDelete(place);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") suppressClick.current = false;
          if (changeable && (event.key === "Delete" || event.key === "Backspace")) {
            event.preventDefault();
            cancelGesture();
            onDelete(place);
          }
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (suppressClick.current) {
            event.preventDefault();
            return;
          }
          onSelect(place);
        }}
      >
        <span aria-hidden="true">{place.markerIcon}</span>
      </button>
      <button type="button" className="place__popup" aria-label={place.name} tabIndex={selected ? 0 : -1} onClick={(event) => { event.stopPropagation(); onSelect(place); }}>
        <div className="place__popup-cover">
          {place.mediaIds.length > 0 ? (
            <>
            <img src={mediaPreviewUrl(place.mediaIds[0])} alt="" loading="lazy" />
            {place.mediaIds.length > 1 && (
              <span className="place__popup-count">+{place.mediaIds.length - 1}</span>
            )}
            </>
          ) : <span className="place__popup-placeholder" aria-hidden="true">{place.markerIcon}</span>}
        </div>
        <strong>{place.name}</strong>
        {place.address && <small>{place.address}</small>}
        <small className="place__popup-author">{t("By {username}", { username: place.owner.username })}</small>
        <StarRating value={place.rating} size="sm" />
      </button>
    </div>
  );
}

function PlaceClusterMarker({ group, selectedId, onSelect, canChange, onMove, onDelete, homeExpanded, nearHome, onHomeHoverChange }: {
  homeExpanded: boolean;
  nearHome: boolean;
  onHomeHoverChange?: (hovered: boolean) => void;
  group: MapMarkerGroup<Place>;
  selectedId: string | null;
  onSelect: (place: Place) => void;
} & Pick<Props, "canChange" | "onMove" | "onDelete">) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const count = group.items.length;
  const selectedIndex = group.items.findIndex((place) => place.id === selectedId);
  const expanded = count === 1 || open || selectedIndex >= 0 || homeExpanded;
  const ordered = selectedIndex > 0
    ? [group.items[selectedIndex], ...group.items.filter((_, index) => index !== selectedIndex)]
    : group.items;
  const visiblePlaces = ordered.slice(0, 8);
  const step = Math.min(26, 150 / Math.max(visiblePlaces.length - 1, 1));
  const toggleLabel = t("{count} places here", { count });

  return (
    <div className={`place__cluster${count > 1 ? " place__cluster--group" : ""}`} data-open={expanded}
      data-home-expanded={homeExpanded} data-near-home={nearHome} data-selected={selectedIndex >= 0}
      style={{ "--fan-count": visiblePlaces.length, "--fan-step": `${step}deg` } as CSSProperties}
      onPointerEnter={() => { setOpen(true); onHomeHoverChange?.(true); }}
      onPointerLeave={() => { setOpen(false); onHomeHoverChange?.(false); }}
      onFocus={() => { setOpen(true); onHomeHoverChange?.(true); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); onHomeHoverChange?.(false); } }}
      onMouseEnter={(event) => {
        const marker = event.currentTarget.closest<HTMLElement>(".mapboxgl-marker");
        if (marker) marker.style.zIndex = "30";
      }}
      onMouseLeave={(event) => {
        const marker = event.currentTarget.closest<HTMLElement>(".mapboxgl-marker");
        if (marker) marker.style.zIndex = group.items.some((place) => place.id === selectedId) ? "30" : "1";
      }}>
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
            <PlaceMarker place={place} selected={place.id === selectedId} onSelect={onSelect}
              canChange={canChange} onMove={onMove} onDelete={onDelete} />
          </div>
        );
      })}
      {count > 1 && (
        <button
          type="button"
          className="place__cluster-toggle"
          aria-expanded={expanded}
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
        >
          <span className="place__cluster-count" aria-hidden="true">{count}</span>
        </button>
      )}
    </div>
  );
}

function PlaceMarkers({ places, selectedId, ready, onSelect, canChange, onMove, onDelete, homeLocation, homeHovered, onHomeHoverChange }: {
  homeLocation: HomeLocation | null;
  homeHovered: boolean;
  onHomeHoverChange: (hovered: boolean) => void;
  places: Place[];
  selectedId: string | null;
  ready: boolean;
  onSelect: (place: Place) => void;
} & Pick<Props, "canChange" | "onMove" | "onDelete">) {
  const { current: map } = useMap();
  const [project, setProject] = useState<MapProjector | null>(null);

  useEffect(() => {
    if (!map || !ready || typeof map.project !== "function") return;
    const update = () => setProject(() => (location: MapCoordinate) => map.project([location.longitude, location.latitude]));
    update();
    if (typeof map.on !== "function") return;
    map.on("moveend", update);
    return () => { map.off("moveend", update); };
  }, [map, ready]);

  const groups = useMemo(
    () => clusterMapMarkers(places, (place) => place, project),
    [places, project],
  );

  return (
    <>
      {groups.map((group) => {
        const nearHome = !!homeLocation && mapMarkersOverlap(group.location, homeLocation, project);
        const homeExpanded = homeHovered && nearHome;
        return (
        <Fragment key={group.items[0].id}>
        <Marker
          latitude={nearHome && homeLocation ? homeLocation.latitude : group.location.latitude}
          longitude={nearHome && homeLocation ? homeLocation.longitude : group.location.longitude}
          anchor="bottom"
          style={{ zIndex: group.items.some((place) => place.id === selectedId) ? 30 : 1 }}
          onClick={(event) => event.originalEvent.stopPropagation()}
        >
          <PlaceClusterMarker group={group} selectedId={selectedId} onSelect={onSelect}
            homeExpanded={homeExpanded} nearHome={nearHome}
            onHomeHoverChange={homeExpanded ? onHomeHoverChange : undefined}
            canChange={canChange} onMove={onMove} onDelete={onDelete} />
        </Marker>
        {nearHome && homeLocation && (group.items.length === 1 || !homeExpanded) && (
          <Marker latitude={homeLocation.latitude} longitude={homeLocation.longitude} anchor="bottom"
            style={{ zIndex: 22, pointerEvents: "none" }}>
            <div className="place__cluster" aria-hidden="true">
              <span className="place__cluster-count">{group.items.length}</span>
            </div>
          </Marker>
        )}
        </Fragment>
        );
      })}
    </>
  );
}

function MapContent({
  places, selectedId, focusZoom, draft, picking, homeLocation,
  homeLocationReady, homePicking, homeActionDisabled, onSelect, onPick, onPickHome,
  onHomeClick, onCreateAtCurrentLocation, token,
  canChange, onMove, onDelete, onEdit, onEditDraft, onCancelSelection, onCancelDraft,
}: Props & { token: string }) {
  const { t } = useLocale();
  const shouldReduceMotion = useShouldReduceMotion();
  const mapRef = useRef<MapRef>(null);
  const scenesRef = useRef<HTMLDetailsElement>(null);
  const appearanceRef = useRef<HTMLDetailsElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [initialLocationResolved, setInitialLocationResolved] = useState(false);
  const [hasInitialCenter, setHasInitialCenter] = useState(false);
  const [scene, setScene] = useState<MapScene>("3d");
  const [showMarkers, setShowMarkers] = useState(true);
  const mapAppearance = useMapAppearance();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [homeRequest, setHomeRequest] = useState(0);
  const { homeHovered, onHomeHoverChange } = useHomeMarkerHover();
  const [focusRequest, setFocusRequest] = useState(0);
  const resolveInitialLocation = useCallback((hasCenter: boolean) => {
    setHasInitialCenter(hasCenter);
    setInitialLocationResolved(true);
  }, []);
  const selected = useMemo(
    () => places.find((place) => place.id === selectedId),
    [places, selectedId],
  );
  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (scenesRef.current?.contains(event.target) || appearanceRef.current?.contains(event.target)) return;
      if (scenesRef.current) scenesRef.current.open = false;
      if (appearanceRef.current) appearanceRef.current.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      const activeControl = [scenesRef.current, appearanceRef.current].find((control) => control?.open);
      if (event.key === "Escape" && activeControl) {
        if (scenesRef.current) scenesRef.current.open = false;
        if (appearanceRef.current) appearanceRef.current.open = false;
        activeControl.querySelector("summary")?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const selectSearchResult = (result: LocationSearchResult) => {
    mapRef.current?.easeTo({
      center: [result.longitude, result.latitude],
      zoom: 15,
      duration: 400,
    });
    const coordinate = { latitude: result.latitude, longitude: result.longitude };
    if (homePicking) onPickHome(coordinate);
    else onPick(coordinate, result.placeName, "search");
  };

  if (failed)
    return <>
      <ErrorState message="Mapbox could not load. Check internet access, WebGL support, the public access token, account billing, and allowed website URLs. Places can only be placed on the map." />
      {selected && <NavigationFallback destination={{ ...selected, name: selected.name }} />}
    </>;

  return (
    <div className="place__map map-controls" role="region" aria-label={t("Places map")}>
      <Map
        style={{ minHeight: "inherit" }}
        ref={mapRef}
        mapboxAccessToken={token}
        attributionControl={false}
        mapStyle={scene === "3d" ? "mapbox://styles/mapbox/standard" : "mapbox://styles/mapbox/streets-v12"}
        config={{ basemap: getMapAppearanceConfig(mapAppearance.lighting, mapAppearance.colorTheme) }}
        initialViewState={{ latitude: 20, longitude: 0, zoom: 2, pitch: 0, bearing: 0 }}
        cursor={picking || homePicking ? "crosshair" : undefined}
        cooperativeGestures={false}
        onLoad={(event) => { event.target.setCooperativeGestures(false); setLoaded(true); }}
        onError={() => setFailed(true)}
        onClick={(event) => {
          if (navigationOpen || scenesRef.current?.open || appearanceRef.current?.open
            || document.querySelector('[role="dialog"], [role="alertdialog"], dialog[open]')) return;
          const place = findPlaceAt(event, scene === "3d" ? "standard" : "classic");
          const point = place
            ? { latitude: place.latitude, longitude: place.longitude }
            : (() => {
                const wrapped = event.lngLat.wrap();
                return { latitude: wrapped.lat, longitude: wrapped.lng };
              })();
          if (homePicking) {
            onPickHome(point);
            return;
          }
          if (place) {
            onPick(point, place.placeName);
            return;
          }
          onPick(point);
        }}
      >
        <MapAppearanceConfig
          lighting={mapAppearance.lighting}
          colorTheme={mapAppearance.colorTheme}
        />
        <GeolocateControl
          position="bottom-right"
          positionOptions={{ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }}
          trackUserLocation={false}
          showUserLocation={false}
          onGeolocate={(event) => {
            if (navigationOpen) return;
            const coordinate = {
              latitude: event.coords.latitude,
              longitude: event.coords.longitude,
            };
            if (homePicking) onPickHome(coordinate);
            else onPick(coordinate);
          }}
          onError={() => showToast.error(t("Could not determine your current location. Check location permission and try again."))}
        />
        <InitialLocationCenter
          homeLocation={homeLocation}
          homeLocationReady={homeLocationReady}
          ready={loaded && homeRequest === 0 && !selected}
          onResolved={resolveInitialLocation}
        />
        <MapViewport
          focusZoom={focusZoom}
          places={places}
          selected={selected}
          ready={loaded && !navigationOpen}
          allowFit={initialLocationResolved && !hasInitialCenter && !draft}
        />
        <MapCameraScene scene={scene} selected={selected} ready={loaded && !navigationOpen}
          homeLocation={homeLocation} homeRequest={homeRequest} focusRequest={focusRequest} />
        <MapResizer />
        {loaded && !homePicking && (selected && !picking || !selected && picking && draft) && (
          <MapNavigation destination={selected
            ? { latitude: selected.latitude, longitude: selected.longitude, name: selected.name }
            : { ...draft!, name: t("New place") }}
            accessToken={token} homeLocation={homeLocation} onOpenChange={setNavigationOpen}
            onEdit={selected
              ? canChange(selected) ? () => onEdit(selected) : undefined
              : onEditDraft}
            editAction={selected ? "edit" : "add"}
            onCancel={selected ? onCancelSelection : onCancelDraft} />
        )}
        {(!loaded || homePicking || (picking && (!!selected || !draft)) || (!selected && !draft))
          && <DisabledNavigationToolbar />}
        {homeLocation && (
          <HomeLocationMarker location={homeLocation} variant="place" onHoverChange={onHomeHoverChange} onClick={() => {
            mapRef.current?.easeTo({
              center: [homeLocation.longitude, homeLocation.latitude],
              zoom: Math.max(mapRef.current.getZoom(), 18),
              pitch: scene === "3d" ? 55 : 0,
              bearing: scene === "3d" ? -20 : 0,
              duration: shouldReduceMotion ? 0 : 400,
            });
          }} />
        )}
        {showMarkers && (
          <PlaceMarkers places={places} selectedId={selectedId} ready={loaded}
            homeLocation={homeLocation} homeHovered={homeHovered} onHomeHoverChange={onHomeHoverChange}
            canChange={(place) => !navigationOpen && canChange(place)} onMove={onMove} onDelete={onDelete} onSelect={(item) => {
            setFocusRequest((request) => request + 1);
            onSelect(item);
          }} />
        )}
        {draft && (
          <Marker
            latitude={draft.latitude}
            longitude={draft.longitude}
            anchor="bottom"
            draggable={picking}
            style={{ zIndex: 3 }}
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              if (picking) onCancelDraft();
            }}
            onDragEnd={(event) => {
              const point = event.lngLat.wrap();
              onPick({ latitude: point.lat, longitude: point.lng });
            }}
          >
            <div
              className="place__marker place__marker--draft"
              role="img"
              aria-label={t("Drag to adjust this place")}
            >
              <span className="place__pin place__pin--draft" aria-hidden="true" />
            </div>
          </Marker>
        )}
      </Map>
      <MapLoadingOverlay ready={loaded} className="map-loading-overlay" />
      <LocationSearch
        disabled={!loaded || navigationOpen}
        onFocus={() => {
          if (window.matchMedia("(max-width: 640px)").matches) {
            if (scenesRef.current) scenesRef.current.open = false;
            if (appearanceRef.current) appearanceRef.current.open = false;
          }
        }}
        onSelect={selectSearchResult}
      />
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <button
          type="button"
          className="place__add-marker-control"
          aria-label={t("Add place")}
          title={t("Add place")}
          disabled={!loaded || homeActionDisabled}
          onClick={() => {
            if (scenesRef.current) scenesRef.current.open = false;
            if (appearanceRef.current) appearanceRef.current.open = false;
            if (!navigator.geolocation) {
              showToast.error(t("Could not determine your current location. Check location permission and try again."));
              return;
            }
            navigator.geolocation.getCurrentPosition(
              ({ coords }) => onCreateAtCurrentLocation({
                latitude: coords.latitude,
                longitude: coords.longitude,
              }),
              () => showToast.error(t("Could not determine your current location. Check location permission and try again.")),
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
            );
          }}
        >
          <Plus size={20} aria-hidden="true" />
        </button>
      </AnimateIcon>
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <button
          type="button"
          className="place__map-home-control"
          aria-label={t(homeLocation ? "Go to home" : "Home location")}
          title={t(homeLocation ? "Go to home" : "Home location")}
          disabled={!loaded || !homeLocationReady || homeActionDisabled}
          onClick={() => {
            if (homeLocation) {
              setHasInitialCenter(true);
              setHomeRequest((request) => request + 1);
              if (scenesRef.current) scenesRef.current.open = false;
              if (appearanceRef.current) appearanceRef.current.open = false;
            }
            onHomeClick();
          }}
        >
          <Home size={18} aria-hidden="true" />
        </button>
      </AnimateIcon>
      <details ref={scenesRef} className="place__scenes" aria-label={t("Map scenes")}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (event.target instanceof Element && event.target.closest("summary")) return;
          if (scenesRef.current) scenesRef.current.open = false;
          if (appearanceRef.current) appearanceRef.current.open = false;
        }}>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <summary
            className="place__scenes-title"
            aria-label={t("Setting")}
            onClick={() => {
              if (appearanceRef.current) appearanceRef.current.open = false;
            }}
          >
            <Settings size={20} aria-hidden="true" />
            <span className="place__scenes-label">{t("Setting")}</span>
            <span className="place__scenes-chevron" aria-hidden="true">
              <ChevronDown size={16} animate={false} />
            </span>
          </summary>
        </AnimateIcon>
        <div className="place__scene-list">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="place__scene" aria-pressed={scene === "streets"}
              onClick={() => setScene("streets")}>
              <span className="place__scene-icon" aria-hidden="true"><Home size={20} /></span>
              <span className="place__scene-copy"><strong>{t("Street map")}</strong></span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="place__scene" aria-pressed={scene === "3d"}
              onClick={() => setScene("3d")}>
              <span className="place__scene-icon" aria-hidden="true"><Globe size={20} animation="spin" /></span>
              <span className="place__scene-copy"><strong>{t("3D Basemap")}</strong></span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="place__scene" aria-pressed={showMarkers}
              onClick={() => setShowMarkers((visible) => !visible)}>
              <span className="place__scene-icon" aria-hidden="true"><Key size={20} /></span>
              <span className="place__scene-copy"><strong>{t("Place markers")}</strong></span>
            </button>
          </AnimateIcon>
        </div>
      </details>
      <details
        ref={appearanceRef}
        className="place__scenes map-appearance-control"
        aria-label={t("Map appearance")}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (event.target instanceof Element && event.target.closest("summary")) return;
          if (scenesRef.current) scenesRef.current.open = false;
          if (appearanceRef.current) appearanceRef.current.open = false;
        }}
        onToggle={(event) => setAppearanceOpen(event.currentTarget.open)}
      >
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <summary
            className="place__scenes-title"
            aria-label={t("Map appearance")}
            onClick={() => {
              if (scenesRef.current) scenesRef.current.open = false;
            }}
          >
            <SlidersHorizontal size={20} aria-hidden="true" />
            <span>{t("Map appearance")}</span>
            <span className="place__scenes-chevron" aria-hidden="true">
              <ChevronDown size={16} animate={false} />
            </span>
          </summary>
        </AnimateIcon>
        <MapAppearanceSettings {...mapAppearance} isOpen={appearanceOpen} />
      </details>
    </div>
  );
}

export function PlaceMap(props: Props) {
  const { t } = useLocale();
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
  if (!token || !token.startsWith("pk.")) {
    const selected = props.places.find((place) => place.id === props.selectedId);
    return <>
      {!token
        ? <p className="place__map-message" role="status">{t("Set VITE_MAPBOX_ACCESS_TOKEN to enable Mapbox. Places can only be placed on the map.")}</p>
        : <ErrorState message="Mapbox requires a public access token starting with pk. Never use a secret token in the frontend." />}
      {selected && <NavigationFallback destination={{ ...selected, name: selected.name }} />}
    </>;
  }
  return <MapContent key={token} {...props} token={token} />;
}
