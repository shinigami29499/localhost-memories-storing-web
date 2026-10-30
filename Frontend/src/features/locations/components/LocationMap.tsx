import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Map, { GeolocateControl, Marker, useMap, type MapRef } from "react-map-gl/mapbox";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import "mapbox-gl/dist/mapbox-gl.css";
import "./mapControls.css";
import { ErrorState, showToast, Spinner } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { MapPin } from "../../../components/animate-ui/icons/map-pin";
import { Globe } from "../../../components/animate-ui/icons/globe";
import { Home } from "../../../components/animate-ui/icons/home";
import { Settings } from "../../../components/animate-ui/icons/settings";
import { Sun } from "../../../components/animate-ui/icons/sun";
import { ChevronDown } from "../../../components/animate-ui/icons/chevron-down";
import {
  getMapAppearanceConfig,
  MapAppearanceConfig,
  MapAppearanceSettings,
  useMapAppearance,
} from "./MapAppearanceSettings";
import { LocationSearch } from "./LocationSearch";
import { HomeLocationMarker } from "./HomeLocationMarker";
import type { LocationSearchResult } from "../services/locationSearchService";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { mediaPreviewUrl } from "../../../utils/media";
import type { MediaFile, PhotoLocation, PickedLocation } from "../../media/types";
import { findPlaceAt } from "../utils/findPlaceAt";
import type { HomeLocation } from "../types";
import { MapNavigation } from "../../navigation/components/MapNavigation";
import { NavigationFallback } from "../../navigation/components/NavigationOptions";

interface Props {
  media: MediaFile[];
  selected: MediaFile | undefined;
  focused?: MediaFile;
  draft: PickedLocation | null;
  editable: boolean;
  homeLocation: HomeLocation | null;
  homeLocationReady: boolean;
  homePicking: boolean;
  homeActionDisabled: boolean;
  onSelect: (media: MediaFile) => void;
  canMove: (media: MediaFile) => boolean;
  onMove: (media: MediaFile, location: PickedLocation) => void;
  onPick: (location: PickedLocation) => void;
  onPickHome: (location: HomeLocation) => void;
  onHomeClick: () => void;
}

const MOBILE_PREVIEW_PADDING = { top: 300, bottom: 0, left: 0, right: 0 };

function MapViewport({ media, selected, ready, allowFit }: Pick<Props, "media" | "selected"> & {
  ready: boolean;
  allowFit: boolean;
}) {
  const { current: map } = useMap();
  const isMobile = useMediaQuery("(max-width: 640px)");
  useEffect(() => {
    if (!map || !ready || !allowFit || selected?.location) return;
    const locations = media.flatMap((item) => item.location ? [item.location] : []);
    if (!locations.length) return;
    const first = locations[0];
    let west = first.longitude, east = first.longitude;
    let south = first.latitude, north = first.latitude;
    for (const location of locations) {
      west = Math.min(west, location.longitude);
      east = Math.max(east, location.longitude);
      south = Math.min(south, location.latitude);
      north = Math.max(north, location.latitude);
    }
    map.fitBounds([[west, south], [east, north]], { padding: 48, maxZoom: 16, duration: 0 });
  }, [map, ready, allowFit, media, selected?.location]);

  useEffect(() => {
    if (map && ready && selected?.location) {
      map.jumpTo({
        center: [selected.location.longitude, selected.location.latitude],
        zoom: Math.max(map.getZoom(), 12),
        ...(isMobile ? { padding: MOBILE_PREVIEW_PADDING, retainPadding: false } : {}),
      });
    }
  }, [map, ready, selected?.id, selected?.location, isMobile]);
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

type MapScene = "streets" | "3d";

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
  selected: MediaFile | undefined;
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
        zoom: 14,
        pitch: 0,
        bearing: 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
        duration: shouldReduceMotion ? 0 : 400,
      });
      return;
    }
    if (!selected?.location && !sceneChanged) return;
    map.easeTo({
      ...(selected?.location
        ? {
            center: [selected.location.longitude, selected.location.latitude] as [number, number],
            zoom: Math.max(map.getZoom(), 18),
          }
        : {}),
      pitch: scene === "3d" && selected?.location ? 55 : 0,
      bearing: scene === "3d" && selected?.location ? -20 : 0,
      duration: shouldReduceMotion ? 0 : 400,
      ...(isMobile && selected?.location ? { padding: MOBILE_PREVIEW_PADDING, retainPadding: false } : {}),
    });
  }, [map, ready, scene, selected?.id, selected?.location, shouldReduceMotion, isMobile, homeLocation, homeRequest, focusRequest]);
  return null;
}

type Projector = (location: PhotoLocation) => { x: number; y: number };

interface PhotoCluster {
  id: string;
  latitude: number;
  longitude: number;
  items: MediaFile[];
}

/** Photos closer than this on screen share one marker. Degrees are the fallback before the map projects. */
const CLUSTER_RADIUS_PX = 46;
const CLUSTER_RADIUS_DEGREES = 0.0008;
const MAX_FANNED_PHOTOS = 8;

function clusterPhotos(media: MediaFile[], project: Projector | null): PhotoCluster[] {
  const radius = project ? CLUSTER_RADIUS_PX : CLUSTER_RADIUS_DEGREES;
  const toPoint: Projector = project ?? ((location) => ({ x: location.longitude, y: location.latitude }));
  const clusters: Array<PhotoCluster & { x: number; y: number }> = [];
  for (const item of media) {
    if (!item.location) continue;
    const point = toPoint(item.location);
    const near = clusters.find((cluster) => Math.hypot(cluster.x - point.x, cluster.y - point.y) <= radius);
    if (near) near.items.push(item);
    else clusters.push({
      id: item.id, latitude: item.location.latitude, longitude: item.location.longitude, items: [item], ...point,
    });
  }
  return clusters;
}

function PhotoPin({ item, selected, movable, onSelect, onMove }: {
  item: MediaFile;
  selected: boolean;
  movable: boolean;
  onSelect: Props["onSelect"];
  onMove: Props["onMove"];
}) {
  const { current: map } = useMap();
  const gesture = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  return (
    <button type="button" className="locations__pin" title={item.originalFilename}
      aria-label={item.originalFilename} aria-pressed={selected}
      data-movable={movable}
      style={{ translate: `${offset.x}px ${offset.y}px` }}
      onPointerDown={(event) => {
        suppressClick.current = false;
        if (!movable || !map || event.button !== 0 || !event.isPrimary) return;
        event.preventDefault();
        event.stopPropagation();
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const start = gesture.current;
        if (!start || start.id !== event.pointerId) return;
        const x = event.clientX - start.x, y = event.clientY - start.y;
        if (Math.hypot(x, y) > 8) start.dragging = true;
        if (start.dragging) setOffset({ x, y });
      }}
      onPointerUp={(event) => {
        const start = gesture.current;
        if (!start || start.id !== event.pointerId) return;
        gesture.current = null;
        setOffset({ x: 0, y: 0 });
        event.currentTarget.releasePointerCapture(event.pointerId);
        if (!start.dragging || !map || !item.location) return;
        suppressClick.current = true;
        const origin = map.project([item.location.longitude, item.location.latitude]);
        const point = map.unproject([
          origin.x + event.clientX - start.x,
          origin.y + event.clientY - start.y,
        ]).wrap();
        onMove(item, { latitude: point.lat, longitude: point.lng });
      }}
      onLostPointerCapture={() => {
        gesture.current = null;
        setOffset({ x: 0, y: 0 });
      }}
      onPointerCancel={() => {
        suppressClick.current = true;
        gesture.current = null;
        setOffset({ x: 0, y: 0 });
      }}
      onClick={(event) => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
          return;
        }
        onSelect(item);
      }}>
      <img src={mediaPreviewUrl(item.id)} alt="" loading="lazy" draggable={false} />
    </button>
  );
}

function PhotoClusterMarker({ cluster, selected, onSelect, canMove, onMove }: {
  cluster: PhotoCluster;
  selected: MediaFile | undefined;
  onSelect: (media: MediaFile) => void;
  canMove: Props["canMove"];
  onMove: Props["onMove"];
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const count = cluster.items.length;
  const selectedIndex = cluster.items.findIndex((item) => item.id === selected?.id);
  const ordered = selectedIndex > 0
    ? [cluster.items[selectedIndex], ...cluster.items.filter((_, index) => index !== selectedIndex)]
    : cluster.items;
  const fanned = ordered.slice(0, MAX_FANNED_PHOTOS);
  const expanded = count === 1 || open || selectedIndex >= 0;
  const step = Math.min(26, 150 / Math.max(fanned.length - 1, 1));

  return (
    <div
      className={`locations__cluster${count > 1 ? " locations__cluster--group" : ""}`}
      data-open={expanded}
      data-selected={selectedIndex >= 0}
      style={{ "--fan-count": fanned.length, "--fan-step": `${step}deg` } as CSSProperties}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    >
      {fanned.map((item, index) => item.location && (
        <div key={item.id} className="locations__marker" data-selected={selected?.id === item.id}
          style={{ "--fan-index": index } as CSSProperties}>
          <PhotoPin item={item} selected={selected?.id === item.id} movable={canMove(item)}
            onSelect={onSelect} onMove={onMove} />
          <article className="locations__popup" aria-label={item.originalFilename}>
            <img src={mediaPreviewUrl(item.id)} alt={item.originalFilename} loading="lazy" />
            <div>
              <small>{t("By {username}", { username: item.ownerUsername ?? t("Unknown") })}</small>
            </div>
          </article>
        </div>
      ))}
      {count > 1 && (
        <button type="button" className="locations__cluster-toggle" aria-expanded={expanded}
          title={t("{count} photos here", { count })} aria-label={t("{count} photos here", { count })}
          onClick={() => setOpen((value) => !value)}>
          <span className="locations__cluster-count" aria-hidden="true">{count}</span>
        </button>
      )}
    </div>
  );
}

function PhotoMarkers({ media, selected, ready, onSelect, canMove, onMove }: Pick<Props, "media" | "selected" | "onSelect" | "canMove" | "onMove"> & { ready: boolean }) {
  const { current: map } = useMap();
  const [project, setProject] = useState<Projector | null>(null);
  useEffect(() => {
    if (!map || !ready || typeof map.project !== "function") return;
    const update = () => setProject(() => (location: PhotoLocation) => map.project([location.longitude, location.latitude]));
    update();
    if (typeof map.on !== "function") return;
    map.on("moveend", update);
    return () => { map.off("moveend", update); };
  }, [map, ready]);
  const clusters = useMemo(() => clusterPhotos(media, project), [media, project]);

  return (
    <>
      {clusters.map((cluster) => (
        <Marker
          key={cluster.id}
          latitude={cluster.latitude}
          longitude={cluster.longitude}
          anchor="bottom"
          style={{ zIndex: cluster.items.some((item) => item.id === selected?.id) ? 2 : 1 }}
          onClick={(event) => event.originalEvent.stopPropagation()}
        >
          <PhotoClusterMarker cluster={cluster} selected={selected} onSelect={onSelect} canMove={canMove} onMove={onMove} />
        </Marker>
      ))}
    </>
  );
}

function MapContent({
  media, selected, focused, draft, editable, homeLocation, homeLocationReady, homePicking, homeActionDisabled,
  onSelect, canMove, onMove, onPick, onPickHome, onHomeClick, token,
}: Props & { token: string }) {
  const { t } = useLocale();
  const shouldReduceMotion = useShouldReduceMotion();
  const mapRef = useRef<MapRef>(null);
  const scenesRef = useRef<HTMLDetailsElement>(null);
  const appearanceRef = useRef<HTMLDetailsElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapScene>("3d");
  const [showMarkers, setShowMarkers] = useState(true);
  const mapAppearance = useMapAppearance();
  const [homeRequest, setHomeRequest] = useState(0);
  const [focusRequest, setFocusRequest] = useState(0);
  const [initialLocationResolved, setInitialLocationResolved] = useState(false);
  const [hasInitialCenter, setHasInitialCenter] = useState(false);
  const located = useMemo(() => media.filter((item) => item.location), [media]);
  const cameraTarget = selected ?? focused;
  const resolveInitialLocation = useCallback((hasCenter: boolean) => {
    setHasInitialCenter(hasCenter);
    setInitialLocationResolved(true);
  }, []);
  const styleUrl = mapStyle === "3d"
    ? "mapbox://styles/mapbox/standard"
    : "mapbox://styles/mapbox/streets-v12";

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
    const location = { latitude: result.latitude, longitude: result.longitude, placeName: result.placeName };
    if (homePicking) onPickHome(location);
    else if (editable) onPick(location);
  };

  if (failed)
    return <>
      <ErrorState message="Mapbox could not load. Check internet access, WebGL support, the public access token, account billing, and allowed website URLs. Photo locations can only be set on the map." />
      {selected?.location && <NavigationFallback destination={{ ...selected.location, name: selected.originalFilename }} />}
    </>;

  return (
    <div className="locations__map map-controls" role="region" aria-label={t("Photo locations")}>
      {!loaded && <div className="locations__map-loading"><Spinner label="Loading map…" /></div>}
      <Map
        style={{ minHeight: "inherit" }}
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle={styleUrl}
        config={{ basemap: getMapAppearanceConfig(mapAppearance.lighting, mapAppearance.colorTheme) }}
        initialViewState={{ latitude: 20, longitude: 0, zoom: 2, pitch: 0, bearing: 0 }}
        cursor={!navigationOpen && (editable || homePicking) ? "crosshair" : undefined}
        cooperativeGestures
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        onClick={(event) => {
          if (navigationOpen) return;
          const place = findPlaceAt(event, mapStyle === "3d" ? "standard" : "classic");
          const point = event.lngLat.wrap();
          const location = place ?? { latitude: point.lat, longitude: point.lng };
          if (homePicking) onPickHome(location);
          else if (editable) onPick(location);
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
            const location = {
              latitude: event.coords.latitude,
              longitude: event.coords.longitude,
            };
            if (homePicking) onPickHome(location);
            else if (editable) onPick(location);
          }}
          onError={() => showToast.error(t("Could not determine your current location. Check location permission and try again."))}
        />
        <InitialLocationCenter
          homeLocation={homeLocation}
          homeLocationReady={homeLocationReady}
          ready={loaded && homeRequest === 0 && !cameraTarget?.location}
          onResolved={resolveInitialLocation}
        />
        <MapViewport
          media={media}
          selected={cameraTarget}
          ready={loaded && !navigationOpen}
          allowFit={initialLocationResolved && !hasInitialCenter}
        />
        <MapCameraScene scene={mapStyle} selected={cameraTarget} ready={loaded && !navigationOpen}
          homeLocation={homeLocation} homeRequest={homeRequest} focusRequest={focusRequest} />
        <MapResizer />
        {loaded && selected?.location && !homePicking && (
          <MapNavigation destination={{ ...selected.location, name: selected.originalFilename }} accessToken={token}
            onOpenChange={setNavigationOpen} />
        )}
        {homeLocation && (
          <HomeLocationMarker location={homeLocation} variant="locations" onClick={() => {
            mapRef.current?.easeTo({
              center: [homeLocation.longitude, homeLocation.latitude],
              zoom: Math.max(mapRef.current.getZoom(), 18),
              pitch: mapStyle === "3d" ? 55 : 0,
              bearing: mapStyle === "3d" ? -20 : 0,
              duration: shouldReduceMotion ? 0 : 400,
            });
          }} />
        )}
        {showMarkers && <PhotoMarkers media={located} selected={selected} ready={loaded}
          onSelect={(item) => {
            if (selected?.id !== item.id) setFocusRequest((request) => request + 1);
            onSelect(item);
          }} canMove={(item) => !navigationOpen && canMove(item)} onMove={onMove} />}
        {editable && draft && !navigationOpen && (
          <Marker
            latitude={draft.latitude}
            longitude={draft.longitude}
            draggable
            style={{ zIndex: 3 }}
            onClick={(event) => event.originalEvent.stopPropagation()}
            onDragEnd={(event) => {
              const point = event.lngLat.wrap();
              onPick({ latitude: point.lat, longitude: point.lng });
            }}
          >
            <span className="locations__pin locations__pin--draft" title={t("Drag to adjust location")}
              aria-label={t("Drag to adjust location")}>+</span>
          </Marker>
        )}
      </Map>
      <LocationSearch
        accessToken={token}
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
          className="locations__map-home-control"
          aria-label={t(homeLocation ? "Go to home" : "Set home location")}
          title={t(homeLocation ? "Go to home" : "Set home location")}
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
      <details ref={scenesRef} className="locations__scenes" aria-label={t("Map scenes")}>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <summary
            className="locations__scenes-title"
            aria-label={t("Setting")}
            onClick={() => {
              if (appearanceRef.current) appearanceRef.current.open = false;
            }}
          >
            <Settings size={20} aria-hidden="true" />
            <span>{t("Setting")}</span>
            <span className="locations__scenes-chevron" aria-hidden="true">
              <ChevronDown size={16} animate={false} />
            </span>
          </summary>
        </AnimateIcon>
        <div className="locations__scene-list">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="locations__scene" aria-pressed={mapStyle === "streets"}
              onClick={() => setMapStyle("streets")}>
              <span className="locations__scene-icon" aria-hidden="true">
                <Home size={20} />
              </span>
              <span className="locations__scene-copy">
                <strong>{t("Street map")}</strong>
              </span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="locations__scene" aria-pressed={mapStyle === "3d"}
              onClick={() => setMapStyle("3d")}>
              <span className="locations__scene-icon" aria-hidden="true">
                <Globe size={20} animation="spin" />
              </span>
              <span className="locations__scene-copy">
                <strong>{t("3D Basemap")}</strong>
              </span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="locations__scene" aria-pressed={showMarkers}
              onClick={() => setShowMarkers((visible) => !visible)}>
              <span className="locations__scene-icon" aria-hidden="true">
                <MapPin size={20} />
              </span>
              <span className="locations__scene-copy">
                <strong>{t("Photo markers")}</strong>
              </span>
            </button>
          </AnimateIcon>
        </div>
      </details>
      <details ref={appearanceRef} className="locations__scenes map-appearance-control" aria-label={t("Map appearance")}>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <summary
            className="locations__scenes-title"
            aria-label={t("Map appearance")}
            onClick={() => {
              if (scenesRef.current) scenesRef.current.open = false;
            }}
          >
            <Sun size={20} animate={false} aria-hidden="true" />
            <span>{t("Map appearance")}</span>
            <span className="locations__scenes-chevron" aria-hidden="true">
              <ChevronDown size={16} animate={false} />
            </span>
          </summary>
        </AnimateIcon>
        <MapAppearanceSettings {...mapAppearance} />
      </details>
    </div>
  );
}

export function LocationMap(props: Props) {
  const { t } = useLocale();
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
  if (!token || !token.startsWith("pk."))
    return <>
      {!token
        ? <p className="locations__map-message" role="status">{t("Set VITE_MAPBOX_ACCESS_TOKEN to enable Mapbox. Photo locations can only be set on the map.")}</p>
        : <ErrorState message="Mapbox requires a public access token starting with pk. Never use a secret token in the frontend." />}
      {props.selected?.location && (
        <NavigationFallback destination={{ ...props.selected.location, name: props.selected.originalFilename }} />
      )}
    </>;
  return <MapContent key={token} {...props} token={token} />;
}
