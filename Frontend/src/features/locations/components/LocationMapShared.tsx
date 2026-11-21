import { Camera } from "../../../components/animate-ui/icons/camera";
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from "react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react";
import { Marker, useMap, type MapRef } from "react-map-gl/mapbox";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { useAnimationStore } from "../../../store/animationStore";
import "mapbox-gl/dist/mapbox-gl.css";
import { showToast } from "../../../components/ui";
import { useMapAppearance } from "./mapAppearance";
import { useHomeMarkerHover } from "../hooks/useHomeMarkerHover";
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

export interface Props {
  MarkerPreview?: ComponentType<PhotoMarkerPreviewProps>;
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
  onBrowseAlbums: () => void;
}

const MOBILE_PREVIEW_PADDING = { top: 300, bottom: 0, left: 0, right: 0 };

export function MapViewport({ media, selected, ready, allowFit }: Pick<Props, "media" | "selected"> & {
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

export function InitialLocationCenter({
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
export function MapResizer() {
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

export function MapCameraScene({ scene, selected, ready, homeLocation, homeRequest, focusRequest }: {
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

export type PhotoPinProps = {
  item: MediaFile;
  selected: boolean;
  movable: boolean;
  onSelect: Props["onSelect"];
  onMove: Props["onMove"];
  onDragChange?: (dragging: boolean) => void;
};

export function usePhotoPinController({ item, selected, movable, onSelect, onMove, onDragChange }: PhotoPinProps) {
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
  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
        suppressClick.current = false;
        if (!movable || !map || event.button !== 0 || !event.isPrimary) return;
        event.preventDefault();
        event.stopPropagation();
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      };
  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const start = gesture.current;
        if (!start || start.id !== event.pointerId) return;
        const x = event.clientX - start.x, y = event.clientY - start.y;
        if (!start.dragging && Math.hypot(x, y) > 8) {
          start.dragging = true;
          onDragChange?.(true);
        }
        if (start.dragging) setOffset({ x, y });
      };
  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
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
      };
  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
          return;
        }
        onSelect(item);
      };
  return { map, animateMarker, pinRef, offset, cancelGesture, handlePointerDown, handlePointerMove, handlePointerUp, handleClick };
}

export function PhotoPin(props: PhotoPinProps) {
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

export interface PhotoMarkerPreviewProps { item: MediaFile }

function PhotoMarkerPreview({ item }: PhotoMarkerPreviewProps) {
  const { t } = useLocale();
  return <>
    <img src={mediaPreviewUrl(item.id, false, 320)} alt={item.originalFilename} />
    <div><small>{t("By {username}", { username: item.ownerUsername ?? t("Unknown") })}</small></div>
  </>;
}

export type PhotoMarkerItemProps = {
  item: MediaFile;
  index: number;
  selected: boolean;
  canMove: Props["canMove"];
  onSelect: Props["onSelect"];
  onMove: Props["onMove"];
  onDragChange?: (dragging: boolean) => void;
  hidePreview: boolean;
  MarkerPreview?: ComponentType<PhotoMarkerPreviewProps>;
  PinComponent?: ComponentType<PhotoPinProps>;
};

export function PhotoMarkerItem({ item, index, selected, canMove, onSelect, onMove, onDragChange, hidePreview, MarkerPreview = PhotoMarkerPreview, PinComponent = PhotoPin }: PhotoMarkerItemProps) {
  const [hovered, setHovered] = useState(false);
  return <div className="map-marker locations__marker" data-selected={selected}
    style={{ "--fan-index": index, "--marker-color": photoMarkerColor(item.id) } as CSSProperties}
    onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
    onFocus={() => setHovered(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}>
    <PinComponent item={item} selected={selected} movable={canMove(item)} onSelect={onSelect} onMove={onMove} onDragChange={onDragChange} />
    {!hidePreview && (hovered || selected) && <article className="locations__popup" aria-label={item.originalFilename}>
      <MarkerPreview item={item} />
    </article>}
  </div>;
}

const photoMarkerPalette = ["#6A3F36", "#C8A796", "#EEA988", "#F8E4BE"] as const;

export function photoMarkerColor(id: string) {
  const hash = Array.from(id).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
  return photoMarkerPalette[hash % photoMarkerPalette.length];
}

export type PhotoClusterMarkerProps = {
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
  MarkerPreview?: ComponentType<PhotoMarkerPreviewProps>;
  PinComponent?: ComponentType<PhotoPinProps>;
};

export function usePhotoClusterMarkerController({ cluster, shadowLocation, selected, onSelect, canMove, onMove, onDragChange, homeExpanded, nearHome, onHomeHoverChange, onActiveChange, hidePreview, hideCount, MarkerPreview, PinComponent }: PhotoClusterMarkerProps) {
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
  return { t, open, setOpen, setPage, count, selectedIndex, pageCount, currentPage, fanned, expanded, step };
}

export function PhotoClusterMarker(props: PhotoClusterMarkerProps) {
  const { cluster, shadowLocation, selected, onSelect, canMove, onMove, onDragChange, homeExpanded, nearHome, onHomeHoverChange, onActiveChange, hidePreview, hideCount, MarkerPreview, PinComponent } = props;
  const { t, open, setOpen, setPage, count, selectedIndex, pageCount, currentPage, fanned, expanded, step } = usePhotoClusterMarkerController(props);

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
          canMove={canMove} onSelect={onSelect} onMove={onMove} onDragChange={onDragChange} hidePreview={hidePreview} MarkerPreview={MarkerPreview} PinComponent={PinComponent} />
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
  MarkerPreview?: ComponentType<PhotoMarkerPreviewProps>;
  PinComponent?: ComponentType<PhotoPinProps>;
  ClusterComponent?: ComponentType<PhotoClusterMarkerProps>;
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

export function PhotoMarkers({ media, selected, ready, onSelect, canMove, onMove, onDragChange, homeLocation, homeHovered, onHomeHoverChange, hidePreview, hideCount = false, MarkerPreview, PinComponent, ClusterComponent = PhotoClusterMarker }: PhotoMarkersProps) {
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
          <ClusterComponent cluster={cluster} shadowLocation={nearHome && homeLocation ? homeLocation : cluster}
            PinComponent={PinComponent}
            homeExpanded={homeExpanded} nearHome={nearHome}
            hidePreview={hidePreview}
            MarkerPreview={MarkerPreview}
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


export function useLocationMapController({
  MarkerPreview,
  media, selected, focused, draft, editable, editing, relocating, onConfirmRelocation, homeLocation, homeLocationReady, homePicking, homeRelocationDraft, homeActionDisabled,
  onSelect, onEdit, onCancelSelection, canMove, onMove, onPick, onPickHome, onMoveHome, onConfirmHomeRelocation, onCancelHomeRelocation, onHomeClick, onBrowseAlbums, onBoundsChange, token,
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
  return { t, shouldReduceMotion, isMobile, mapRef, scenesRef, appearanceRef, loaded, setLoaded, failed, setFailed, navigationOpen, setNavigationOpen, mapboxPreview, setMapboxPreview, mapStyle, setMapStyle, showMarkers, setShowMarkers, mapAppearance, appearanceOpen, setAppearanceOpen, homeRequest, setHomeRequest, homeHovered, onHomeHoverChange, homeSelected, setHomeSelected, markerDragging, setMarkerDragging, focusRequest, setFocusRequest, initialLocationResolved, hasInitialCenter, setHasInitialCenter, markerMedia, draftDiffers, cameraTarget, resolveInitialLocation, selectSearchResult };
}
