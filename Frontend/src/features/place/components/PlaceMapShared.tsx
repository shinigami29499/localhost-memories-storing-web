import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type RefObject } from "react";
import { Marker, useMap, type MapRef } from "react-map-gl/mapbox";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import "mapbox-gl/dist/mapbox-gl.css";
import { showToast } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAnimationStore } from "../../../store/animationStore";
import { mediaPreviewUrl } from "../../../utils/media";
import {
  clusterMapMarkers,
  isMarkerInViewport,
  mapMarkersOverlap,
  type MapCoordinate,
  type MapMarkerGroup,
  type MapProjector,
} from "../../../utils/mapMarkerGroups";
import { useMapAppearance } from "../../locations/components/mapAppearance";
import { StarRating } from "./StarRating";
import type { PlaceDialogProps } from "./PlaceDialog";
import { useHomeMarkerHover } from "../../locations/hooks/useHomeMarkerHover";
import type { LocationSearchResult } from "../../locations/services/locationSearchService";
import { findPlaceAt } from "../../locations/utils/findPlaceAt";
import type { HomeLocation } from "../../locations/types";
import type { PlaceCoordinate, Place } from "../types";
import type { MediaFile } from "../../media/types";
import type { PhotoMarkerPreviewProps } from "../../locations/components/LocationMapShared";
import { usePlace } from "../hooks/usePlaces";
import type { PlaceMapBounds } from "../services/placeService";
import { viewportBounds } from "../../locations/utils/mapBounds";

export interface Props {
  onLoadingSettledChange?: (settled: boolean) => void;
  DialogComponent?: ComponentType<PlaceDialogProps>;
  MarkerPreview?: ComponentType<PlaceMarkerPreviewProps>;
  PhotoMarkerPreview?: ComponentType<PhotoMarkerPreviewProps>;
  onAddToolbarChange: (toolbar: { visible: boolean; disabled: boolean; add: () => void } | null) => void;
  settingsRef?: RefObject<PlaceMapSettings>;
  onBoundsChange?: (bounds: PlaceMapBounds) => void;
  places: Place[];
  photos?: MediaFile[];
  selectedPhoto?: MediaFile;
  photoRelocating?: boolean;
  canMovePhoto: (media: MediaFile) => boolean;
  onSelectPhoto: (media: MediaFile) => void;
  onMovePhoto: (media: MediaFile, coordinate: PlaceCoordinate) => void;
  onEditPhoto: (media: MediaFile) => void;
  onConfirmPhotoMove: () => void;
  selectedId: string | null;
  draft: PlaceCoordinate | null;
  relocatingPlace?: Place | null;
  picking: boolean;
  editorOpen?: boolean;
  homeLocation: HomeLocation | null;
  homeLocationReady: boolean;
  homePicking: boolean;
  homeRelocationDraft?: HomeLocation | null;
  homeActionDisabled: boolean;
  canChange: (place: Place) => boolean;
  onMove: (place: Place, coordinate: PlaceCoordinate) => void;
  onDelete: (place: Place) => void;
  onSelect: (place: Place) => void;
  onEdit: (place: Place) => void;
  onEditDraft: () => void;
  onConfirmRelocation?: () => void;
  onCancelRelocation?: () => void;
  onCancelSelection: () => void;
  onCancelDraft: () => void;
  onPickHome: (coordinate: HomeLocation) => void;
  onMoveHome?: (coordinate: HomeLocation) => void;
  onConfirmHomeRelocation?: () => void;
  onCancelHomeRelocation?: () => void;
  onCreateAtCurrentLocation: (coordinate: PlaceCoordinate) => void;
  onBrowseAlbums: () => void;
  onHomeClick: () => void;
  /** `placeName` is set when the click snapped to a basemap place label. */
  onPick: (coordinate: PlaceCoordinate, placeName?: string, source?: "search") => void;
}

type MapScene = "streets" | "3d";

export interface PlaceMapSettings {
  scene: MapScene;
  showMarkers: boolean;
  showPhotoMarkers: boolean;
}

const MOBILE_PREVIEW_PADDING = { top: 300, bottom: 0, left: 0, right: 0 };

export interface PlaceMarkerPreviewProps { place: Place; mediaIds: string[] }

function PlaceMarkerPreview({ place, mediaIds }: PlaceMarkerPreviewProps) {
  const { t } = useLocale();
  return <>
    <div className="place__popup-cover">
      {mediaIds.length ? <>
        <img src={mediaPreviewUrl(mediaIds[0], false, 320)} alt="" />
        {mediaIds.length > 1 && <span className="place__popup-count">+{mediaIds.length - 1}</span>}
      </> : <span className="place__popup-placeholder" aria-hidden="true">{place.markerIcon}</span>}
    </div>
    <strong>{place.name}</strong>
    {place.address && <small>{place.address}</small>}
    <small className="place__popup-author">{t("By {username}", { username: place.owner.username })}</small>
    <StarRating value={place.rating} size="sm" />
  </>;
}

export function MapViewport({ places, selected, ready, allowFit }: {
  places: Place[];
  selected: Place | undefined;
  ready: boolean;
  allowFit: boolean;
}) {
  const { current: map } = useMap();
  const fitted = useRef(false);
  const hadSelection = useRef(false);
  useEffect(() => {
    if (selected) hadSelection.current = true;
    if (hadSelection.current) return;
    if (!map || !ready || !allowFit || selected || !places.length) return;
    if (fitted.current) return;
    fitted.current = true;
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

export function MapCameraScene({ scene, selected, draft, ready, homeLocation, homeRequest, focusRequest }: {
  scene: MapScene;
  selected: Place | undefined;
  draft: PlaceCoordinate | null;
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
  const handledFocusRequest = useRef(focusRequest);
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
    const shouldFocusDraft = focusRequest !== handledFocusRequest.current;
    handledFocusRequest.current = focusRequest;
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
    if (!selected && !(shouldFocusDraft && draft) && !sceneChanged) return;
    map.easeTo({
      ...(selected
        ? {
            center: [selected.longitude, selected.latitude] as [number, number],
            zoom: Math.max(map.getZoom(), 18),
          }
        : shouldFocusDraft && draft
          ? {
              center: [draft.longitude, draft.latitude] as [number, number],
              zoom: Math.max(map.getZoom(), 18),
            }
        : {}),
      pitch: scene === "3d" && (selected || (shouldFocusDraft && draft)) ? 55 : 0,
      bearing: scene === "3d" && (selected || (shouldFocusDraft && draft)) ? -20 : 0,
      duration: shouldReduceMotion ? 0 : 400,
      ...(isMobile && (selected || (shouldFocusDraft && draft)) ? { padding: MOBILE_PREVIEW_PADDING, retainPadding: false } : {}),
    });
  }, [map, ready, scene, selected?.id, selected?.latitude, selected?.longitude, draft?.latitude, draft?.longitude, shouldReduceMotion, isMobile, homeLocation, homeRequest, focusRequest]);
  return null;
}

export type PlaceMarkerProps = {
  place: Place;
  selected: boolean;
  onSelect: (place: Place) => void;
  hidePreview: boolean;
  onDragChange?: (dragging: boolean) => void;
  MarkerPreview?: ComponentType<PlaceMarkerPreviewProps>;
} & Pick<Props, "canChange" | "onMove" | "onDelete">;

export function usePlaceMarkerController({ place, selected, onSelect, canChange, onMove, onDelete, onDragChange, hidePreview, MarkerPreview = PlaceMarkerPreview }: PlaceMarkerProps) {
  const { t } = useLocale();
  const animateMarker = useAnimationStore((state) => state.enabled && state.iconsEnabled);
  const { current: map } = useMap();
  const pinRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const preview = usePlace(place.id, !hidePreview && (hovered || selected));
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
    onDragChange?.(false);
    if (pinRef.current?.hasPointerCapture(start.id)) pinRef.current.releasePointerCapture(start.id);
    setOffset({ x: 0, y: 0 });
  }, [cancelHold, onDragChange]);

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
  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
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
        };
  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
          const start = gesture.current;
          if (!start || start.id !== event.pointerId) return;
          const x = event.clientX - start.x, y = event.clientY - start.y;
          if (Math.hypot(x, y) > 8) {
            cancelHold();
            if (!start.dragging) {
              start.dragging = true;
              onDragChange?.(true);
            }
          }
          if (start.dragging) setOffset({ x, y });
        };
  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
          const start = gesture.current;
          if (!start || start.id !== event.pointerId) return;
          gesture.current = null;
          onDragChange?.(false);
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
        };
  const handleContextMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
          if (changeable && (event.button === 2 || (!gesture.current && !suppressClick.current))) {
            cancelGesture();
            suppressClick.current = true;
            onDelete(place);
          }
        };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
          if (event.key === "Enter" || event.key === " ") suppressClick.current = false;
          if (changeable && (event.key === "Delete" || event.key === "Backspace")) {
            event.preventDefault();
            cancelGesture();
            onDelete(place);
          }
        };
  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          if (suppressClick.current) {
            event.preventDefault();
            return;
          }
          onSelect(place);
        };
  return { t, animateMarker, map, pinRef, offset, hovered, setHovered, preview, changeable, cancelGesture, handlePointerDown, handlePointerMove, handlePointerUp, handleContextMenu, handleKeyDown, handleClick };
}

export function PlaceMarker(props: PlaceMarkerProps) {
  const { place, selected, onSelect, canChange, onMove, onDelete, onDragChange, hidePreview, MarkerPreview = PlaceMarkerPreview } = props;
  const { t, animateMarker, map, pinRef, offset, hovered, setHovered, preview, changeable, cancelGesture, handlePointerDown, handlePointerMove, handlePointerUp, handleContextMenu, handleKeyDown, handleClick } = usePlaceMarkerController(props);

  return (
    <div className="map-marker place__marker" data-selected={selected} style={{ translate: `${offset.x}px ${offset.y}px`, "--marker-color": place.markerColor } as CSSProperties}
      onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}>
      <button
        ref={pinRef}
        type="button"
        className="map-marker__pin place__pin"
      data-marker-motion={animateMarker}
        data-changeable={changeable}
        title={changeable ? t("Drag to move this place. Hold or right-click to delete.") : place.name}
        aria-label={place.name}
        aria-pressed={selected}
        aria-haspopup="dialog"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onLostPointerCapture={cancelGesture}
        onPointerCancel={cancelGesture}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
      >
        <span className="map-marker__center" aria-hidden="true">{place.markerIcon}</span>
      </button>
      {!hidePreview && (hovered || selected) && <button type="button" className="place__popup" aria-label={place.name} tabIndex={selected ? 0 : -1} onClick={(event) => { event.stopPropagation(); onSelect(place); }}>
        <MarkerPreview place={place} mediaIds={preview.data?.mediaIds ?? []} />
      </button>}
    </div>
  );
}

export type PlaceClusterMarkerProps = {
  shadowLocation: MapCoordinate;
  homeExpanded: boolean;
  nearHome: boolean;
  onHomeHoverChange?: (hovered: boolean) => void;
  onActiveChange?: (active: boolean) => void;
  group: MapMarkerGroup<Place>;
  selectedId: string | null;
  onSelect: (place: Place) => void;
  hidePreview: boolean;
  onDragChange?: (dragging: boolean) => void;
  hideCount: boolean;
  MarkerPreview?: ComponentType<PlaceMarkerPreviewProps>;
  MarkerComponent?: ComponentType<PlaceMarkerProps>;
} & Pick<Props, "canChange" | "onMove" | "onDelete">;

export function usePlaceClusterMarkerController({ group, shadowLocation, selectedId, onSelect, canChange, onMove, onDelete, onDragChange, homeExpanded, nearHome, onHomeHoverChange, onActiveChange, hidePreview, hideCount, MarkerPreview, MarkerComponent = PlaceMarker }: PlaceClusterMarkerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const count = group.items.length;
  const selectedIndex = group.items.findIndex((place) => place.id === selectedId);
  const expanded = count === 1 || open || selectedIndex >= 0 || homeExpanded;
  const ordered = group.items;
  const pageCount = Math.ceil(count / 20);
  const currentPage = page % Math.max(1, pageCount);
  const visiblePlaces = ordered.slice(currentPage * 20, currentPage * 20 + 20);
  const step = Math.min(26, 150 / Math.max(visiblePlaces.length - 1, 1));
  const toggleLabel = t("{count} places here", { count });
  return { t, open, setOpen, setPage, count, selectedIndex, expanded, ordered, pageCount, currentPage, visiblePlaces, step, toggleLabel };
}

export function PlaceClusterMarker(props: PlaceClusterMarkerProps) {
  const { group, shadowLocation, selectedId, onSelect, canChange, onMove, onDelete, onDragChange, homeExpanded, nearHome, onHomeHoverChange, onActiveChange, hidePreview, hideCount, MarkerPreview, MarkerComponent = PlaceMarker } = props;
  const { t, open, setOpen, setPage, count, selectedIndex, expanded, ordered, pageCount, currentPage, visiblePlaces, step, toggleLabel } = usePlaceClusterMarkerController(props);

  return (
    <>
    <Marker latitude={shadowLocation.latitude} longitude={shadowLocation.longitude} anchor="bottom" style={{ zIndex: 0, pointerEvents: "none" }}>
      <div className={`place__cluster${count > 1 ? " place__cluster--group" : ""}`} data-open={expanded} data-home-expanded={homeExpanded} data-near-home={nearHome}
        style={{ "--fan-count": visiblePlaces.length, "--fan-step": `${step}deg` } as CSSProperties} aria-hidden="true">
        {visiblePlaces.map((place, index) => <span key={place.id} className="map-marker__shadow place__cluster-shadow"
          style={{ "--fan-index": index, "--marker-color": place.markerColor } as CSSProperties} />)}
      </div>
    </Marker>
    <div className={`place__cluster${count > 1 ? " place__cluster--group" : ""}`} data-open={expanded}
      data-home-expanded={homeExpanded} data-near-home={nearHome} data-selected={selectedIndex >= 0}
      style={{ "--fan-count": visiblePlaces.length, "--fan-step": `${step}deg`, "--counter-color": nearHome ? "#000" : `color-mix(in srgb, ${ordered[0].markerColor || "#30353b"}, black 35%)` } as CSSProperties}
      onPointerEnter={() => { setOpen(true); onActiveChange?.(true); onHomeHoverChange?.(true); }}
      onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) { setOpen(false); onActiveChange?.(false); onHomeHoverChange?.(false); } }}
      onFocus={() => { setOpen(true); onActiveChange?.(true); onHomeHoverChange?.(true); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(":hover")) { setOpen(false); onActiveChange?.(false); onHomeHoverChange?.(false); } }}
      >
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
            <MarkerComponent place={place} selected={place.id === selectedId} onSelect={onSelect}
              canChange={canChange} onMove={onMove} onDelete={onDelete} onDragChange={onDragChange} hidePreview={hidePreview} MarkerPreview={MarkerPreview} />
          </div>
        );
      })}
      {count > 1 && !hideCount && (
        <span className="place__cluster-count" aria-label={toggleLabel}>{count}</span>
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

export function PlaceMarkers({ places, selectedId, ready, onSelect, canChange, onMove, onDelete, onDragChange, homeLocation, homeHovered, onHomeHoverChange, hidePreview, hideCount = false, MarkerPreview, MarkerComponent, ClusterComponent = PlaceClusterMarker }: {
  homeLocation: HomeLocation | null;
  homeHovered: boolean;
  onHomeHoverChange: (hovered: boolean) => void;
  hidePreview: boolean;
  onDragChange?: (dragging: boolean) => void;
  hideCount?: boolean;
  MarkerPreview?: ComponentType<PlaceMarkerPreviewProps>;
  MarkerComponent?: ComponentType<PlaceMarkerProps>;
  ClusterComponent?: ComponentType<PlaceClusterMarkerProps>;
  places: Place[];
  selectedId: string | null;
  ready: boolean;
  onSelect: (place: Place) => void;
} & Pick<Props, "canChange" | "onMove" | "onDelete">) {
  const { current: map } = useMap();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [project, setProject] = useState<MapProjector | null>(null);

  useEffect(() => {
    if (!map || !ready || typeof map.project !== "function") return;
    const update = () => setProject(() => (location: MapCoordinate) => map.project([location.longitude, location.latitude]));
    update();
    if (typeof map.on !== "function") return;
    map.on("move", update);
    map.on("resize", update);
    return () => { map.off("move", update); map.off("resize", update); };
  }, [map, ready]);

  const groups = useMemo(
    () => {
      const container = map?.getContainer();
      const visible = places.filter((place) => isMarkerInViewport(place, project, container?.clientWidth ?? 0, container?.clientHeight ?? 0));
      return clusterMapMarkers(visible, (place) => place, project);
    },
    [places, project, map],
  );
  const homeGroups = homeLocation
    ? groups.filter((group) => group.items.some((place) => mapMarkersOverlap(place, homeLocation, project)))
    : [];
  const homeItems = homeGroups.flatMap((group) => group.items);
  const homeGroup: MapMarkerGroup<Place> | null = homeLocation && homeItems.length
    ? { location: homeLocation, items: homeItems }
    : null;
  const visibleGroups = [
    ...(homeGroup ? [homeGroup] : []),
    ...groups.filter((group) => !homeGroups.includes(group)),
  ];

  return (
    <>
      {visibleGroups.map((group) => {
        const nearHome = group === homeGroup;
        const homeExpanded = homeHovered && nearHome;
        const groupId = group.items[0].id;
        const selectedHere = group.items.some((place) => place.id === selectedId);
        const baseDepth = Math.round((project?.(nearHome && homeLocation ? homeLocation : group.location).y ?? 0) * 10);
        return (
        <Fragment key={groupId}>
        <Marker
          latitude={nearHome && homeLocation ? homeLocation.latitude : group.location.latitude}
          longitude={nearHome && homeLocation ? homeLocation.longitude : group.location.longitude}
          anchor="bottom"
          style={{ zIndex: 100000 + baseDepth + (nearHome ? -1 : selectedHere ? 2000000 : activeGroupId === groupId ? 1000000 : 0) }}
          onClick={(event) => event.originalEvent.stopPropagation()}
        >
          <ClusterComponent group={group} shadowLocation={nearHome && homeLocation ? homeLocation : group.location} selectedId={selectedId} onSelect={onSelect}
            MarkerComponent={MarkerComponent}
            homeExpanded={homeExpanded} nearHome={nearHome}
            hidePreview={hidePreview}
            MarkerPreview={MarkerPreview}
            hideCount={hideCount}
            onHomeHoverChange={homeExpanded ? onHomeHoverChange : undefined}
            onActiveChange={(active) => setActiveGroupId((current) => active ? groupId : current === groupId ? null : current)}
            canChange={canChange} onMove={onMove} onDelete={onDelete} onDragChange={onDragChange} />
        </Marker>
        {!hideCount && nearHome && homeLocation && (group.items.length === 1 || !homeExpanded) && (
          <Marker latitude={homeLocation.latitude} longitude={homeLocation.longitude} anchor="bottom"
            style={{ zIndex: 100000 + Math.round((project?.(homeLocation).y ?? 0) * 10) + 2, pointerEvents: "none" }}>
            <div className="place__cluster" style={{ "--counter-color": "#000" } as CSSProperties} aria-hidden="true">
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


export function usePlaceMapController({
  DialogComponent,
  MarkerPreview,
  PhotoMarkerPreview,
  places, photos = [], selectedPhoto, photoRelocating = false, selectedId, draft, picking, editorOpen, relocatingPlace, homeLocation,
  homeLocationReady, homePicking, homeRelocationDraft, homeActionDisabled, onSelect, onPick, onPickHome, onMoveHome, onConfirmHomeRelocation, onCancelHomeRelocation,
  onHomeClick, onCreateAtCurrentLocation, onBrowseAlbums, token,
  canChange, onMove, onDelete, onEdit, onEditDraft, onConfirmRelocation, onCancelRelocation, onCancelSelection, onCancelDraft,
  canMovePhoto, onSelectPhoto, onMovePhoto, onEditPhoto, onConfirmPhotoMove, settingsRef, onBoundsChange, onAddToolbarChange,
}: Props & { token: string }) {
  const { t } = useLocale();
  const shouldReduceMotion = useShouldReduceMotion();
  const mapRef = useRef<MapRef>(null);
  const scenesRef = useRef<HTMLDetailsElement>(null);
  const appearanceRef = useRef<HTMLDetailsElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [mapboxPreview, setMapboxPreview] = useState(false);
  const [initialLocationResolved, setInitialLocationResolved] = useState(false);
  const [hasInitialCenter, setHasInitialCenter] = useState(false);
  const [scene, setScene] = useState<MapScene>(() => settingsRef?.current.scene ?? "3d");
  const [showMarkers, setShowMarkers] = useState(() => settingsRef?.current.showMarkers ?? true);
  const [showPhotoMarkers, setShowPhotoMarkers] = useState(() => settingsRef?.current.showPhotoMarkers ?? false);
  const [addChoiceOpen, setAddChoiceOpen] = useState(false);
  const mapAppearance = useMapAppearance();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [homeRequest, setHomeRequest] = useState(0);
  const { homeHovered, onHomeHoverChange } = useHomeMarkerHover();
  const [homeSelected, setHomeSelected] = useState(false);
  const [markerDragging, setMarkerDragging] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const relocating = !!relocatingPlace || photoRelocating;
  const photoDraftChanged = !!photoRelocating && !!selectedPhoto?.location && !!draft
    && (draft.latitude !== selectedPhoto.location.latitude || draft.longitude !== selectedPhoto.location.longitude);
  const mapPlaces = relocatingPlace ? places.filter((place) => place.id === relocatingPlace.id) : places;
  const addPlace = () => {
    if (!navigator.geolocation) {
      showToast.error(t("Could not determine your current location. Check location permission and try again."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => onCreateAtCurrentLocation({ latitude: coords.latitude, longitude: coords.longitude }),
      () => showToast.error(t("Could not determine your current location. Check location permission and try again.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };
  const add = () => {
    if (showMarkers && showPhotoMarkers) setAddChoiceOpen(true);
    else if (showPhotoMarkers) onBrowseAlbums();
    else if (showMarkers) addPlace();
  };
  const focusCoordinate = (coordinate: PlaceCoordinate) => {
    mapRef.current?.easeTo({
      center: [coordinate.longitude, coordinate.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 18),
      pitch: scene === "3d" ? 55 : 0,
      bearing: scene === "3d" ? -20 : 0,
      duration: shouldReduceMotion ? 0 : 400,
      ...(window.matchMedia("(max-width: 640px)").matches ? { padding: MOBILE_PREVIEW_PADDING, retainPadding: false } : {}),
    });
  };
  const resolveInitialLocation = useCallback((hasCenter: boolean) => {
    setHasInitialCenter(hasCenter);
    setInitialLocationResolved(true);
  }, []);
  const selected = useMemo(
    () => places.find((place) => place.id === selectedId),
    [places, selectedId],
  );
  const addRef = useRef(add);
  addRef.current = add;
  const showAddToolbar = !homeRelocationDraft && (!loaded || homePicking || (picking && (!!selected || !draft)) || (!selected && !selectedPhoto && !draft && !editorOpen));
  const addDisabled = failed || !loaded || homePicking || homeActionDisabled || (!showMarkers && !showPhotoMarkers);
  useEffect(() => {
    onAddToolbarChange({ visible: showAddToolbar, disabled: addDisabled, add: () => addRef.current() });
  }, [onAddToolbarChange, showAddToolbar, addDisabled]);
  useEffect(() => () => onAddToolbarChange(null), [onAddToolbarChange]);
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
    const coordinate = { latitude: result.latitude, longitude: result.longitude };
    if (homeRelocationDraft) onMoveHome?.(coordinate);
    else if (homePicking) onPickHome(coordinate);
    else onPick(coordinate, result.placeName, "search");
  };
  return { t, shouldReduceMotion, mapRef, scenesRef, appearanceRef, loaded, setLoaded, failed, setFailed, navigationOpen, setNavigationOpen, mapboxPreview, setMapboxPreview, initialLocationResolved, hasInitialCenter, setHasInitialCenter, scene, setScene, showMarkers, setShowMarkers, showPhotoMarkers, setShowPhotoMarkers, addChoiceOpen, setAddChoiceOpen, mapAppearance, appearanceOpen, setAppearanceOpen, homeRequest, setHomeRequest, homeHovered, onHomeHoverChange, homeSelected, setHomeSelected, markerDragging, setMarkerDragging, focusRequest, setFocusRequest, relocating, photoDraftChanged, mapPlaces, addPlace, focusCoordinate, resolveInitialLocation, selected, selectSearchResult };
}
