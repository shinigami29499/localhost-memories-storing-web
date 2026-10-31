import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Map, { GeolocateControl, Marker, useMap, type MapRef } from "react-map-gl/mapbox";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import "mapbox-gl/dist/mapbox-gl.css";
import "../../locations/components/mapControls.css";
import { ErrorState, showToast, Spinner } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { Globe } from "../../../components/animate-ui/icons/globe";
import { Home } from "../../../components/animate-ui/icons/home";
import { Settings } from "../../../components/animate-ui/icons/settings";
import { ChevronDown } from "../../../components/animate-ui/icons/chevron-down";
import { Sun } from "../../../components/animate-ui/icons/sun";
import { Utensils } from "../../../components/animate-ui/icons/utensils";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { mediaPreviewUrl } from "../../../utils/media";
import {
  clusterMapMarkers,
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
import type { LocationSearchResult } from "../../locations/services/locationSearchService";
import { findPlaceAt } from "../../locations/utils/findPlaceAt";
import type { HomeLocation } from "../../locations/types";
import type { FoodCoordinate, FoodPlace } from "../types";
import { MapNavigation } from "../../navigation/components/MapNavigation";
import { NavigationFallback } from "../../navigation/components/NavigationOptions";

interface Props {
  places: FoodPlace[];
  selectedId: string | null;
  draft: FoodCoordinate | null;
  draftIcon: string;
  draftColor: string;
  picking: boolean;
  homeLocation: HomeLocation | null;
  homeLocationReady: boolean;
  homePicking: boolean;
  homeActionDisabled: boolean;
  canChange: (place: FoodPlace) => boolean;
  onMove: (place: FoodPlace, coordinate: FoodCoordinate) => void;
  onDelete: (place: FoodPlace) => void;
  onSelect: (place: FoodPlace) => void;
  onPickHome: (coordinate: HomeLocation) => void;
  onHomeClick: () => void;
  /** `placeName` is set when the click snapped to a basemap place label. */
  onPick: (coordinate: FoodCoordinate, placeName?: string, source?: "search") => void;
}

type MapScene = "streets" | "3d";

const MOBILE_PREVIEW_PADDING = { top: 300, bottom: 0, left: 0, right: 0 };

function MapViewport({ places, selected, ready, allowFit }: {
  places: FoodPlace[];
  selected: FoodPlace | undefined;
  ready: boolean;
  allowFit: boolean;
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
      zoom: Math.max(map.getZoom(), 13),
      ...(isMobile ? { padding: MOBILE_PREVIEW_PADDING, retainPadding: false } : {}),
    });
  }, [map, ready, selected?.id, selected?.latitude, selected?.longitude, isMobile]);
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
  selected: FoodPlace | undefined;
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
  useEffect(() => {
    if (!map || !ready) return;
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

function FoodPlaceMarker({ place, selected, onSelect, canChange, onMove, onDelete }: {
  place: FoodPlace;
  selected: boolean;
  onSelect: (place: FoodPlace) => void;
} & Pick<Props, "canChange" | "onMove" | "onDelete">) {
  const { t } = useLocale();
  const { current: map } = useMap();
  const pinRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null);
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
    <div className="food__marker" data-selected={selected} style={{ translate: `${offset.x}px ${offset.y}px` }}>
      <button
        ref={pinRef}
        type="button"
        className="food__pin"
        style={{ "--marker-color": place.markerColor } as CSSProperties}
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
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
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
            start.dragging = true;
            cancelHold();
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
        {place.mediaIds.length > 0 ? (
          <img src={mediaPreviewUrl(place.mediaIds[0])} alt="" loading="lazy" draggable={false} />
        ) : (
          <span aria-hidden="true">{place.markerIcon}</span>
        )}
      </button>
      <article className="food__popup" aria-label={place.name}>
        {place.mediaIds.length > 0 && (
          <div className="food__popup-cover">
            <img src={mediaPreviewUrl(place.mediaIds[0])} alt="" loading="lazy" />
            {place.mediaIds.length > 1 && (
              <span className="food__popup-count">+{place.mediaIds.length - 1}</span>
            )}
          </div>
        )}
        <strong>{place.name}</strong>
        {place.address && <small>{place.address}</small>}
        <StarRating value={place.rating} size="sm" />
        {place.note && <small>{place.note}</small>}
        <small>{t("By {username}", { username: place.owner.username })}</small>
      </article>
    </div>
  );
}

function getSpiderfyOffset(index: number, count: number) {
  if (count <= 8) {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    const radius = Math.max(52, count * 10);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  }

  const angle = index * 0.5;
  const radius = 48 + index * 4;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function FoodPlaceClusterMarker({ group, selectedId, onSelect, canChange, onMove, onDelete }: {
  group: MapMarkerGroup<FoodPlace>;
  selectedId: string | null;
  onSelect: (place: FoodPlace) => void;
} & Pick<Props, "canChange" | "onMove" | "onDelete">) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const count = group.items.length;
  const selectedIndex = group.items.findIndex((place) => place.id === selectedId);
  const ordered = selectedIndex > 0
    ? [group.items[selectedIndex], ...group.items.filter((_, index) => index !== selectedIndex)]
    : group.items;
  const expanded = count === 1 || open;
  const visiblePlaces = expanded ? ordered : ordered.slice(0, 1);
  const toggleLabel = t(expanded ? "Collapse {count} food places" : "{count} food places here", { count });

  return (
    <div className={`food__cluster${count > 1 ? " food__cluster--group" : ""}`} data-open={expanded}>
      {visiblePlaces.map((place, index) => {
        const offset = count > 1 && expanded ? getSpiderfyOffset(index, count) : { x: 0, y: 0 };
        return (
          <div
            key={place.id}
            className="food__cluster-marker"
            data-selected={place.id === selectedId}
            style={{
              "--spider-index": index,
              "--spider-count": count,
              "--spider-x": `${offset.x}px`,
              "--spider-y": `${offset.y}px`,
            } as CSSProperties}
          >
            <FoodPlaceMarker place={place} selected={place.id === selectedId} onSelect={onSelect}
              canChange={canChange} onMove={onMove} onDelete={onDelete} />
          </div>
        );
      })}
      {count > 1 && (
        <button
          type="button"
          className="food__cluster-toggle"
          aria-expanded={expanded}
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
        >
          <span aria-hidden="true">{expanded ? "×" : count}</span>
        </button>
      )}
    </div>
  );
}

function FoodPlaceMarkers({ places, selectedId, ready, onSelect, canChange, onMove, onDelete }: {
  places: FoodPlace[];
  selectedId: string | null;
  ready: boolean;
  onSelect: (place: FoodPlace) => void;
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
      {groups.map((group) => (
        <Marker
          key={group.items[0].id}
          latitude={group.location.latitude}
          longitude={group.location.longitude}
          anchor="bottom"
          style={{ zIndex: group.items.some((place) => place.id === selectedId) ? 10 : 1 }}
          onMouseEnter={(event) => {
            event.currentTarget.style.zIndex = "20";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.zIndex = group.items.some((place) => place.id === selectedId) ? "10" : "1";
          }}
          onClick={(event) => event.originalEvent.stopPropagation()}
        >
          <FoodPlaceClusterMarker group={group} selectedId={selectedId} onSelect={onSelect}
            canChange={canChange} onMove={onMove} onDelete={onDelete} />
        </Marker>
      ))}
    </>
  );
}

function MapContent({
  places, selectedId, draft, draftIcon, draftColor, picking, homeLocation,
  homeLocationReady, homePicking, homeActionDisabled, onSelect, onPick, onPickHome,
  onHomeClick, token,
  canChange, onMove, onDelete,
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

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
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
      <ErrorState message="Mapbox could not load. Check internet access, WebGL support, the public access token, account billing, and allowed website URLs. Food places can only be placed on the map." />
      {selected && <NavigationFallback destination={{ ...selected, name: selected.name }} />}
    </>;

  return (
    <div className="food__map map-controls" role="region" aria-label={t("Food places map")}>
      {!loaded && <div className="food__map-loading"><Spinner label="Loading map…" /></div>}
      <Map
        style={{ minHeight: "inherit" }}
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle={scene === "3d" ? "mapbox://styles/mapbox/standard" : "mapbox://styles/mapbox/streets-v12"}
        config={{ basemap: getMapAppearanceConfig(mapAppearance.lighting, mapAppearance.colorTheme) }}
        initialViewState={{ latitude: 20, longitude: 0, zoom: 2, pitch: 0, bearing: 0 }}
        cursor={picking || homePicking ? "crosshair" : undefined}
        cooperativeGestures
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        onClick={(event) => {
          if (navigationOpen) return;
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
          places={places}
          selected={selected}
          ready={loaded && !navigationOpen}
          allowFit={initialLocationResolved && !hasInitialCenter && !draft}
        />
        <MapCameraScene scene={scene} selected={selected} ready={loaded && !navigationOpen}
          homeLocation={homeLocation} homeRequest={homeRequest} focusRequest={focusRequest} />
        <MapResizer />
        {loaded && selected && !picking && !homePicking && (
          <MapNavigation destination={{ latitude: selected.latitude, longitude: selected.longitude, name: selected.name }}
            accessToken={token} homeLocation={homeLocation} onOpenChange={setNavigationOpen} />
        )}
        {homeLocation && (
          <HomeLocationMarker location={homeLocation} variant="food" onClick={() => {
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
          <FoodPlaceMarkers places={places} selectedId={selectedId} ready={loaded}
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
            onClick={(event) => event.originalEvent.stopPropagation()}
            onDragEnd={(event) => {
              const point = event.lngLat.wrap();
              onPick({ latitude: point.lat, longitude: point.lng });
            }}
          >
            <span
              className="food__pin food__pin--draft"
              style={{ "--marker-color": draftColor } as CSSProperties}
              title={t("Drag to adjust this place")}
              aria-label={t("Drag to adjust this place")}
            >
              <span aria-hidden="true">{draftIcon}</span>
            </span>
          </Marker>
        )}
      </Map>
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
          className="food__map-home-control"
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
      <details ref={scenesRef} className="food__scenes" aria-label={t("Map scenes")}>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <summary
            className="food__scenes-title"
            aria-label={t("Setting")}
            onClick={() => {
              if (appearanceRef.current) appearanceRef.current.open = false;
            }}
          >
            <Settings size={20} aria-hidden="true" />
            <span className="food__scenes-label">{t("Setting")}</span>
            <span className="food__scenes-chevron" aria-hidden="true">
              <ChevronDown size={16} animate={false} />
            </span>
          </summary>
        </AnimateIcon>
        <div className="food__scene-list">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="food__scene" aria-pressed={scene === "streets"}
              onClick={() => setScene("streets")}>
              <span className="food__scene-icon" aria-hidden="true"><Home size={20} /></span>
              <span className="food__scene-copy"><strong>{t("Street map")}</strong></span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="food__scene" aria-pressed={scene === "3d"}
              onClick={() => setScene("3d")}>
              <span className="food__scene-icon" aria-hidden="true"><Globe size={20} animation="spin" /></span>
              <span className="food__scene-copy"><strong>{t("3D Basemap")}</strong></span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="food__scene" aria-pressed={showMarkers}
              onClick={() => setShowMarkers((visible) => !visible)}>
              <span className="food__scene-icon" aria-hidden="true"><Utensils size={20} /></span>
              <span className="food__scene-copy"><strong>{t("Food markers")}</strong></span>
            </button>
          </AnimateIcon>
        </div>
      </details>
      <details
        ref={appearanceRef}
        className="food__scenes map-appearance-control"
        aria-label={t("Map appearance")}
        onToggle={(event) => setAppearanceOpen(event.currentTarget.open)}
      >
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <summary
            className="food__scenes-title"
            aria-label={t("Map appearance")}
            onClick={() => {
              if (scenesRef.current) scenesRef.current.open = false;
            }}
          >
            <Sun size={20} animate={false} aria-hidden="true" />
            <span>{t("Map appearance")}</span>
            <span className="food__scenes-chevron" aria-hidden="true">
              <ChevronDown size={16} animate={false} />
            </span>
          </summary>
        </AnimateIcon>
        <MapAppearanceSettings {...mapAppearance} isOpen={appearanceOpen} />
      </details>
    </div>
  );
}

export function FoodMap(props: Props) {
  const { t } = useLocale();
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
  if (!token || !token.startsWith("pk.")) {
    const selected = props.places.find((place) => place.id === props.selectedId);
    return <>
      {!token
        ? <p className="food__map-message" role="status">{t("Set VITE_MAPBOX_ACCESS_TOKEN to enable Mapbox. Food places can only be placed on the map.")}</p>
        : <ErrorState message="Mapbox requires a public access token starting with pk. Never use a secret token in the frontend." />}
      {selected && <NavigationFallback destination={{ ...selected, name: selected.name }} />}
    </>;
  }
  return <MapContent key={token} {...props} token={token} />;
}
