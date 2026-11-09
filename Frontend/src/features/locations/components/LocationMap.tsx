import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Map, { GeolocateControl, Marker, useMap, type MapRef } from "react-map-gl/mapbox";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { useAnimationStore } from "../../../store/animationStore";
import "mapbox-gl/dist/mapbox-gl.css";
import "./mapControls.css";
import { ErrorState, showToast } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { MapPin } from "../../../components/animate-ui/icons/map-pin";
import { Camera } from "../../../components/animate-ui/icons/camera";
import { Globe } from "../../../components/animate-ui/icons/globe";
import { Home } from "../../../components/animate-ui/icons/home";
import { Plus } from "../../../components/animate-ui/icons/plus";
import { Settings } from "../../../components/animate-ui/icons/settings";
import { SlidersHorizontal } from "../../../components/animate-ui/icons/sliders-horizontal";
import { ChevronDown } from "../../../components/animate-ui/icons/chevron-down";
import {
  getMapAppearanceConfig,
  MapAppearanceConfig,
  MapAppearanceSettings,
  useMapAppearance,
} from "./MapAppearanceSettings";
import { LocationSearch } from "./LocationSearch";
import { useHomeMarkerHover } from "../hooks/useHomeMarkerHover";
import { HomeLocationMarker } from "./HomeLocationMarker";
import { MapLoadingOverlay } from "./MapLoadingOverlay";
import { MapDraftMarker } from "./MapDraftMarker";
import type { LocationSearchResult } from "../services/locationSearchService";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { mediaPreviewUrl } from "../../../utils/media";
import { clusterMapMarkers, isMarkerInViewport, mapMarkersOverlap, type MapProjector } from "../../../utils/mapMarkerGroups";
import type { MediaFile, PhotoLocation, PickedLocation } from "../../media/types";
import { findPlaceAt } from "../utils/findPlaceAt";
import type { HomeLocation } from "../types";
import type { MapBounds } from "../types";
import { viewportBounds } from "../utils/mapBounds";
import { DisabledNavigationToolbar, MapNavigation, NavigationToolbar } from "../../navigation/components/MapNavigation";
import { NavigationFallback } from "../../navigation/components/NavigationOptions";

interface Props {
  onBoundsChange?: (bounds: MapBounds) => void;
  media: MediaFile[];
  selected: MediaFile | undefined;
  focused?: MediaFile;
  draft: PickedLocation | null;
  editable: boolean;
  editing?: boolean;
  relocating?: boolean;
  onConfirmRelocation?: () => void;
  homeLocation: HomeLocation | null;
  homeLocationReady: boolean;
  homePicking: boolean;
  homeRelocationDraft?: HomeLocation | null;
  homeActionDisabled: boolean;
  onSelect: (media: MediaFile) => void;
  onEdit: (media: MediaFile) => void;
  onCancelSelection: () => void;
  canMove: (media: MediaFile) => boolean;
  onMove: (media: MediaFile, location: PickedLocation) => void;
  onPick: (location: PickedLocation) => void;
  onPickHome: (location: HomeLocation) => void;
  onMoveHome?: (location: HomeLocation) => void;
  onConfirmHomeRelocation?: () => void;
  onCancelHomeRelocation?: () => void;
  onHomeClick: () => void;
  onAddPhotos: () => void;
  onOpenCamera: () => void;
}

const MOBILE_PREVIEW_PADDING = { top: 300, bottom: 0, left: 0, right: 0 };

function MapViewport({ media, selected, ready, allowFit }: Pick<Props, "media" | "selected"> & {
  ready: boolean;
  allowFit: boolean;
}) {
  const { current: map } = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!map || !ready || !allowFit || selected?.location || fitted.current) return;
    const locations = media.flatMap((item) => item.location ? [item.location] : []);
    if (!locations.length) return;
    fitted.current = true;
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

interface PhotoCluster {
  id: string;
  latitude: number;
  longitude: number;
  items: MediaFile[];
}

const MAX_FANNED_PHOTOS = 20;

function PhotoPin({ item, selected, movable, onSelect, onMove, onDragChange }: {
  item: MediaFile;
  selected: boolean;
  movable: boolean;
  onSelect: Props["onSelect"];
  onMove: Props["onMove"];
  onDragChange?: (dragging: boolean) => void;
}) {
  const { current: map } = useMap();
  const animateMarker = useAnimationStore((state) => state.enabled && state.iconsEnabled);
  const pinRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const cancelGesture = useCallback(() => {
    const start = gesture.current;
    if (!start) return;
    gesture.current = null;
    suppressClick.current = true;
    onDragChange?.(false);
    if (pinRef.current?.hasPointerCapture(start.id)) pinRef.current.releasePointerCapture(start.id);
    setOffset({ x: 0, y: 0 });
  }, [onDragChange]);

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
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("blur", cancelGesture);
      document.removeEventListener("pointerdown", outside, true);
    };
  }, [cancelGesture]);

  useEffect(() => {
    if (!movable) cancelGesture();
  }, [movable, cancelGesture]);

  return (
    <button ref={pinRef} type="button" className="map-marker__pin locations__pin" title={item.originalFilename}
      data-marker-motion={animateMarker}
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
        if (!start.dragging && Math.hypot(x, y) > 8) {
          start.dragging = true;
          onDragChange?.(true);
        }
        if (start.dragging) setOffset({ x, y });
      }}
      onPointerUp={(event) => {
        const start = gesture.current;
        if (!start || start.id !== event.pointerId) return;
        gesture.current = null;
        onDragChange?.(false);
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
      onLostPointerCapture={cancelGesture}
      onPointerCancel={cancelGesture}
      onClick={(event) => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
          return;
        }
        onSelect(item);
      }}>
      <span className="map-marker__center" aria-hidden="true"><Camera size={20} /></span>
    </button>
  );
}

function PhotoMarkerItem({ item, index, selected, canMove, onSelect, onMove, onDragChange, hidePreview }: {
  item: MediaFile;
  index: number;
  selected: boolean;
  canMove: Props["canMove"];
  onSelect: Props["onSelect"];
  onMove: Props["onMove"];
  onDragChange?: (dragging: boolean) => void;
  hidePreview: boolean;
}) {
  const { t } = useLocale();
  const [hovered, setHovered] = useState(false);
  return <div className="map-marker locations__marker" data-selected={selected}
    style={{ "--fan-index": index, "--marker-color": photoMarkerColor(item.id) } as CSSProperties}
    onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
    onFocus={() => setHovered(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}>
    <PhotoPin item={item} selected={selected} movable={canMove(item)} onSelect={onSelect} onMove={onMove} onDragChange={onDragChange} />
    {!hidePreview && (hovered || selected) && <article className="locations__popup" aria-label={item.originalFilename}>
      <img src={mediaPreviewUrl(item.id, false, 320)} alt={item.originalFilename} />
      <div><small>{t("By {username}", { username: item.ownerUsername ?? t("Unknown") })}</small></div>
    </article>}
  </div>;
}

const photoMarkerPalette = ["#6A3F36", "#C8A796", "#EEA988", "#F8E4BE"] as const;

function photoMarkerColor(id: string) {
  const hash = Array.from(id).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
  return photoMarkerPalette[hash % photoMarkerPalette.length];
}

function PhotoClusterMarker({ cluster, shadowLocation, selected, onSelect, canMove, onMove, onDragChange, homeExpanded, nearHome, onHomeHoverChange, onActiveChange, hidePreview, hideCount }: {
  shadowLocation: PhotoLocation;
  homeExpanded: boolean;
  nearHome: boolean;
  onHomeHoverChange?: (hovered: boolean) => void;
  onActiveChange?: (active: boolean) => void;
  cluster: PhotoCluster;
  selected: MediaFile | undefined;
  onSelect: (media: MediaFile) => void;
  canMove: Props["canMove"];
  onMove: Props["onMove"];
  onDragChange?: (dragging: boolean) => void;
  hidePreview: boolean;
  hideCount: boolean;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const count = cluster.items.length;
  const selectedIndex = cluster.items.findIndex((item) => item.id === selected?.id);
  const ordered = cluster.items;
  const pageCount = Math.ceil(count / MAX_FANNED_PHOTOS);
  const currentPage = page % Math.max(1, pageCount);
  const fanned = ordered.slice(currentPage * MAX_FANNED_PHOTOS, (currentPage + 1) * MAX_FANNED_PHOTOS);
  const expanded = count === 1 || open || selectedIndex >= 0 || homeExpanded;
  const step = Math.min(26, 150 / Math.max(fanned.length - 1, 1));

  return (
    <>
    <Marker latitude={shadowLocation.latitude} longitude={shadowLocation.longitude} anchor="bottom" style={{ zIndex: 0, pointerEvents: "none" }}>
      <div className={`locations__cluster${count > 1 ? " locations__cluster--group" : ""}`} data-open={expanded} data-home-expanded={homeExpanded} data-near-home={nearHome}
        style={{ "--fan-count": fanned.length, "--fan-step": `${step}deg` } as CSSProperties} aria-hidden="true">
        {fanned.map((item, index) => item.location && <span key={item.id} className="map-marker__shadow locations__cluster-shadow"
          style={{ "--fan-index": index, "--marker-color": photoMarkerColor(item.id) } as CSSProperties} />)}
      </div>
    </Marker>
    <div
      className={`locations__cluster${count > 1 ? " locations__cluster--group" : ""}`}
      data-open={expanded}
      data-home-expanded={homeExpanded}
      data-near-home={nearHome}
      data-selected={selectedIndex >= 0}
      style={{ "--fan-count": fanned.length, "--fan-step": `${step}deg`, "--counter-color": "#000" } as CSSProperties}
      onPointerEnter={() => { setOpen(true); onActiveChange?.(true); onHomeHoverChange?.(true); }}
      onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) { setOpen(false); onActiveChange?.(false); onHomeHoverChange?.(false); } }}
      onFocus={() => { setOpen(true); onActiveChange?.(true); onHomeHoverChange?.(true); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(":hover")) { setOpen(false); onActiveChange?.(false); onHomeHoverChange?.(false); } }}
    >
      {fanned.map((item, index) => item.location && (
        <PhotoMarkerItem key={item.id} item={item} index={index} selected={selected?.id === item.id}
          canMove={canMove} onSelect={onSelect} onMove={onMove} onDragChange={onDragChange} hidePreview={hidePreview} />
      ))}
      {count > 1 && !hideCount && (
        <span className="locations__cluster-count" aria-label={t("{count} photos here", { count })}>{count}</span>
      )}
      {expanded && pageCount > 1 && <button type="button" className="place__cluster-next"
        aria-label={t("Show next markers")} title={t("Show next markers")}
        onClick={(event) => { event.stopPropagation(); setPage((current) => (current + 1) % pageCount); }}>
        {currentPage + 1}/{pageCount} ›
      </button>}
    </div>
    </>
  );
}

export interface PhotoMarkersProps {
  media: MediaFile[];
  selected: MediaFile | undefined;
  ready: boolean;
  onSelect: (media: MediaFile) => void;
  canMove: (media: MediaFile) => boolean;
  onMove: (media: MediaFile, location: PickedLocation) => void;
  onDragChange?: (dragging: boolean) => void;
  homeLocation: HomeLocation | null;
  homeHovered: boolean;
  onHomeHoverChange: (hovered: boolean) => void;
  hidePreview: boolean;
  hideCount?: boolean;
}

export function PhotoMarkers({ media, selected, ready, onSelect, canMove, onMove, onDragChange, homeLocation, homeHovered, onHomeHoverChange, hidePreview, hideCount = false }: PhotoMarkersProps) {
  const { current: map } = useMap();
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [project, setProject] = useState<MapProjector | null>(null);
  useEffect(() => {
    if (!map || !ready || typeof map.project !== "function") return;
    const update = () => setProject(() => (location: PhotoLocation) => map.project([location.longitude, location.latitude]));
    update();
    if (typeof map.on !== "function") return;
    map.on("move", update);
    map.on("resize", update);
    return () => { map.off("move", update); map.off("resize", update); };
  }, [map, ready]);
  const clusters = useMemo(() => {
    const container = map?.getContainer();
    const visible = media.filter((item) => item.location && isMarkerInViewport(item.location, project, container?.clientWidth ?? 0, container?.clientHeight ?? 0));
    return clusterMapMarkers(visible, (item) => item.location, project)
    .map(({ location, items }) => ({
      id: items[0].id,
      latitude: location.latitude,
      longitude: location.longitude,
      items,
    }));
  }, [media, project, map]);

  return (
    <>
      {clusters.map((cluster) => {
        const nearHome = !!homeLocation && mapMarkersOverlap(cluster, homeLocation, project);
        const homeExpanded = homeHovered && nearHome;
        const selectedHere = cluster.items.some((item) => item.id === selected?.id);
        const baseDepth = Math.round((project?.(nearHome && homeLocation ? homeLocation : cluster).y ?? 0) * 10);
        return (
        <Fragment key={cluster.id}>
        <Marker
          latitude={nearHome && homeLocation ? homeLocation.latitude : cluster.latitude}
          longitude={nearHome && homeLocation ? homeLocation.longitude : cluster.longitude}
          anchor="bottom"
          style={{ zIndex: 100000 + baseDepth + (nearHome ? -1 : selectedHere ? 2000000 : activeClusterId === cluster.id ? 1000000 : 0) }}
          onClick={(event) => event.originalEvent.stopPropagation()}
        >
          <PhotoClusterMarker cluster={cluster} shadowLocation={nearHome && homeLocation ? homeLocation : cluster}
            homeExpanded={homeExpanded} nearHome={nearHome}
            hidePreview={hidePreview}
            hideCount={hideCount}
            onHomeHoverChange={homeExpanded ? onHomeHoverChange : undefined}
            onActiveChange={(active) => setActiveClusterId((current) => active ? cluster.id : current === cluster.id ? null : current)}
            selected={selected} onSelect={onSelect} canMove={canMove} onMove={onMove} onDragChange={onDragChange} />
        </Marker>
        {!hideCount && nearHome && homeLocation && (cluster.items.length === 1 || !homeExpanded) && (
          <Marker latitude={homeLocation.latitude} longitude={homeLocation.longitude} anchor="bottom"
            style={{ zIndex: 100000 + Math.round((project?.(homeLocation).y ?? 0) * 10) + 2, pointerEvents: "none" }}>
            <div className="locations__cluster" style={{ "--counter-color": "#000" } as CSSProperties} aria-hidden="true">
              <span className="locations__cluster-count">{cluster.items.length}</span>
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
  media, selected, focused, draft, editable, editing, relocating, onConfirmRelocation, homeLocation, homeLocationReady, homePicking, homeRelocationDraft, homeActionDisabled,
  onSelect, onEdit, onCancelSelection, canMove, onMove, onPick, onPickHome, onMoveHome, onConfirmHomeRelocation, onCancelHomeRelocation, onHomeClick, onAddPhotos, onOpenCamera, onBoundsChange, token,
}: Props & { token: string }) {
  const { t } = useLocale();
  const shouldReduceMotion = useShouldReduceMotion();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const mapRef = useRef<MapRef>(null);
  const scenesRef = useRef<HTMLDetailsElement>(null);
  const appearanceRef = useRef<HTMLDetailsElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [mapboxPreview, setMapboxPreview] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapScene>("3d");
  const [showMarkers, setShowMarkers] = useState(true);
  const mapAppearance = useMapAppearance();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [homeRequest, setHomeRequest] = useState(0);
  const { homeHovered, onHomeHoverChange } = useHomeMarkerHover();
  const [homeSelected, setHomeSelected] = useState(false);
  const [markerDragging, setMarkerDragging] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [initialLocationResolved, setInitialLocationResolved] = useState(false);
  const [hasInitialCenter, setHasInitialCenter] = useState(false);
  const located = useMemo(() => media.filter((item) => item.location), [media]);
  const markerMedia = useMemo(
    () => relocating && selected ? located.filter((item) => item.id === selected.id) : located,
    [relocating, selected?.id, located],
  );
  const draftDiffers = !!draft && (!selected?.location
    || draft.latitude !== selected.location.latitude || draft.longitude !== selected.location.longitude);
  const cameraTarget = selected ?? focused;
  const resolveInitialLocation = useCallback((hasCenter: boolean) => {
    setHasInitialCenter(hasCenter);
    setInitialLocationResolved(true);
  }, []);

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
      duration: shouldReduceMotion ? 0 : 400,
    });
    const location = { latitude: result.latitude, longitude: result.longitude, placeName: result.placeName };
    if (homeRelocationDraft) onMoveHome?.(location);
    else if (homePicking) onPickHome(location);
    else if (editable) onPick(location);
  };

  if (failed)
    return <>
      <ErrorState message="The map could not load. Check your connection and try again. Setting photo locations requires the map." onRetry={() => setFailed(false)} />
      {selected?.location && <NavigationFallback destination={{ ...selected.location, name: selected.originalFilename }} />}
    </>;

  return (
    <div className="locations__map map-controls" data-scene={mapStyle} data-mapbox-preview={mapboxPreview} data-relocating={relocating || undefined} role="region" aria-label={t("Photo locations")}>
      <Map
        style={{ minHeight: "inherit" }}
        ref={mapRef}
        mapboxAccessToken={token}
        attributionControl={false}
        mapStyle="mapbox://styles/mapbox/standard"
        config={{ basemap: getMapAppearanceConfig(mapAppearance.lighting, mapAppearance.colorTheme, mapStyle === "3d") }}
        initialViewState={{ latitude: 20, longitude: 0, zoom: 2, pitch: 0, bearing: 0 }}
        cursor={!navigationOpen && (editable || homePicking || homeRelocationDraft) ? "crosshair" : undefined}
        cooperativeGestures={false}
        onLoad={(event) => {
          event.target.setCooperativeGestures(false);
          setLoaded(true);
          onBoundsChange?.(viewportBounds(event.target.getBounds()));
        }}
        onMoveEnd={(event) => onBoundsChange?.(viewportBounds(event.target.getBounds()))}
        onError={() => setFailed(true)}
        onClick={(event) => {
          if (navigationOpen || scenesRef.current?.open || appearanceRef.current?.open
            || document.querySelector('[role="dialog"], [role="alertdialog"], dialog[open]')) return;
          const place = findPlaceAt(event, "standard");
          const point = event.lngLat.wrap();
          const location = place ?? { latitude: point.lat, longitude: point.lng };
          if (homeRelocationDraft) onMoveHome?.(location);
          else if (homePicking) onPickHome(location);
          else if (editable) onPick(location);
        }}
      >
        <MapAppearanceConfig
          lighting={mapAppearance.lighting}
          colorTheme={mapAppearance.colorTheme}
          show3dObjects={mapStyle === "3d"}
        />
        <GeolocateControl
          key="geolocate-bottom-left"
          position="bottom-left"
          positionOptions={{ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }}
          trackUserLocation={false}
          showUserLocation={false}
          onGeolocate={(event) => {
            if (navigationOpen) return;
            const location = {
              latitude: event.coords.latitude,
              longitude: event.coords.longitude,
            };
            if (homeRelocationDraft) onMoveHome?.(location);
            else if (homePicking) onPickHome(location);
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
        {loaded && homeRelocationDraft && (
          <NavigationToolbar editAction="confirm" showNavigate={false} label={t("Home location")}
            onEdit={onConfirmHomeRelocation}
            onCancel={onCancelHomeRelocation} />
        )}
        {loaded && !homeRelocationDraft && selected?.location && !homePicking && (
          <MapNavigation destination={{ ...(relocating && draft ? draft : selected.location), name: selected.originalFilename }} accessToken={token}
            homeLocation={homeLocation}
            onEdit={relocating ? onConfirmRelocation : canMove(selected) ? () => onEdit(selected) : undefined}
            editAction={relocating ? "confirm" : "edit"} onCancel={onCancelSelection}
            onOpenChange={setNavigationOpen} onMapboxPreviewChange={setMapboxPreview} />
        )}
        {(!loaded || !homeRelocationDraft && (!selected?.location || homePicking)) && <DisabledNavigationToolbar />}
        {homeLocation && !relocating && (
          <HomeLocationMarker location={homeLocation} variant="locations" onHoverChange={onHomeHoverChange} onSelectionChange={setHomeSelected} onDragChange={setMarkerDragging}
            onRelocate={onMoveHome} onClick={() => {
            onHomeClick();
            mapRef.current?.easeTo({
              center: [homeLocation.longitude, homeLocation.latitude],
              zoom: Math.max(mapRef.current.getZoom(), 18),
              pitch: mapStyle === "3d" ? 55 : 0,
              bearing: mapStyle === "3d" ? -20 : 0,
              duration: shouldReduceMotion ? 0 : 400,
            });
          }} />
        )}
        {showMarkers && <PhotoMarkers homeLocation={homeLocation} homeHovered={homeHovered || homeSelected} onHomeHoverChange={onHomeHoverChange} media={markerMedia} selected={selected} ready={loaded} hidePreview={mapboxPreview || !!relocating || !!homeRelocationDraft || markerDragging} hideCount={!!homeRelocationDraft} onDragChange={setMarkerDragging}
          onSelect={(item) => {
            if (selected?.id !== item.id) setFocusRequest((request) => request + 1);
            onSelect(item);
          }} canMove={(item) => !navigationOpen && canMove(item)} onMove={onMove} />}
          {editable && draft && !navigationOpen && (relocating || editing && draftDiffers) && (
          <MapDraftMarker location={draft} label={t("Click the map or drag to set a location")}
            draggable={editable} onPick={onPick} />
        )}
        {homeRelocationDraft && <MapDraftMarker location={homeRelocationDraft} label={t("Change home location")}
          draggable={!navigationOpen} onPick={(location) => onMoveHome?.(location)} />}
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
          className="locations__add-marker-control"
          aria-label={t("Upload photos")}
          title={t("Upload photos")}
          disabled={!loaded || homeActionDisabled}
          onClick={() => {
            if (scenesRef.current) scenesRef.current.open = false;
            if (appearanceRef.current) appearanceRef.current.open = false;
            onAddPhotos();
          }}
        >
          <Plus size={20} aria-hidden="true" />
        </button>
      </AnimateIcon>
      {isMobile && <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <button
          type="button"
          className="locations__camera-control"
          aria-label={t("Capture photo")}
          title={t("Capture photo")}
          disabled={!loaded || homeActionDisabled}
          onClick={() => {
            if (scenesRef.current) scenesRef.current.open = false;
            if (appearanceRef.current) appearanceRef.current.open = false;
            onOpenCamera();
          }}
        >
          <Camera size={20} aria-hidden="true" />
        </button>
      </AnimateIcon>}
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
      <details ref={scenesRef} className="locations__scenes" aria-label={t("Map scenes")}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (event.target instanceof Element && event.target.closest("summary")) return;
          if (scenesRef.current) scenesRef.current.open = false;
          if (appearanceRef.current) appearanceRef.current.open = false;
        }}>
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
              onClick={() => {
                mapAppearance.selectLighting("day");
                mapAppearance.selectColorTheme("default");
                setMapStyle("3d");
              }}>
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
      <details
        ref={appearanceRef}
        className="locations__scenes map-appearance-control"
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
            className="locations__scenes-title"
            aria-label={t("Map appearance")}
            onClick={() => {
              if (scenesRef.current) scenesRef.current.open = false;
            }}
          >
            <SlidersHorizontal size={20} aria-hidden="true" />
            <span>{t("Map appearance")}</span>
            <span className="locations__scenes-chevron" aria-hidden="true">
              <ChevronDown size={16} animate={false} />
            </span>
          </summary>
        </AnimateIcon>
        <MapAppearanceSettings {...mapAppearance} isOpen={appearanceOpen} />
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
