import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import Map, { GeolocateControl, Marker, useMap, type MapRef } from "react-map-gl/mapbox";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import "mapbox-gl/dist/mapbox-gl.css";
import "../../locations/components/mapControls.css";
import { Button, ErrorState, showToast } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { Globe } from "../../../components/animate-ui/icons/globe";
import { Home } from "../../../components/animate-ui/icons/home";
import { Settings } from "../../../components/animate-ui/icons/settings";
import { ChevronDown } from "../../../components/animate-ui/icons/chevron-down";
import { SlidersHorizontal } from "../../../components/animate-ui/icons/sliders-horizontal";
import { Key } from "../../../components/animate-ui/icons/key";
import { MapPin } from "../../../components/animate-ui/icons/map-pin";
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
import {
  getMapAppearanceConfig,
  MapAppearanceConfig,
  MapAppearanceSettings,
  useMapAppearance,
} from "../../locations/components/MapAppearanceSettings";
import { StarRating } from "./StarRating";
import { PlaceDialog } from "./PlaceDialog";
import { LocationSearch } from "../../locations/components/LocationSearch";
import { HomeLocationMarker } from "../../locations/components/HomeLocationMarker";
import { MapLoadingOverlay } from "../../locations/components/MapLoadingOverlay";
import { MapDraftMarker } from "../../locations/components/MapDraftMarker";
import { useHomeMarkerHover } from "../../locations/hooks/useHomeMarkerHover";
import type { LocationSearchResult } from "../../locations/services/locationSearchService";
import { findPlaceAt } from "../../locations/utils/findPlaceAt";
import type { HomeLocation } from "../../locations/types";
import type { PlaceCoordinate, Place } from "../types";
import type { MediaFile } from "../../media/types";
import { PhotoMarkers } from "../../locations/components/LocationMap";
import { MapNavigation } from "../../navigation/components/MapNavigation";
import { NavigationFallback } from "../../navigation/components/NavigationOptions";
import { usePlace } from "../hooks/usePlaces";
import type { PlaceMapBounds } from "../services/placeService";
import { viewportBounds } from "../../locations/utils/mapBounds";

interface Props {
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
  onCreateAtCurrentLocation: (coordinate: PlaceCoordinate) => void;
  onAddPhotos: () => void;
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

function MapViewport({ places, selected, ready, allowFit }: {
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

function MapCameraScene({ scene, selected, draft, ready, homeLocation, homeRequest, focusRequest }: {
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

function PlaceMarker({ place, selected, onSelect, canChange, onMove, onDelete, hidePreview }: {
  place: Place;
  selected: boolean;
  onSelect: (place: Place) => void;
  hidePreview: boolean;
} & Pick<Props, "canChange" | "onMove" | "onDelete">) {
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
    <div className="place__marker" data-selected={selected} style={{ translate: `${offset.x}px ${offset.y}px`, "--marker-color": place.markerColor } as CSSProperties}
      onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}>
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
            cancelHold();
            start.dragging = true;
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
      {!hidePreview && (hovered || selected) && <button type="button" className="place__popup" aria-label={place.name} tabIndex={selected ? 0 : -1} onClick={(event) => { event.stopPropagation(); onSelect(place); }}>
        <div className="place__popup-cover">
          {preview.data?.mediaIds.length ? (
            <>
            <img src={mediaPreviewUrl(preview.data.mediaIds[0], false, 320)} alt="" />
            {preview.data.mediaIds.length > 1 && (
              <span className="place__popup-count">+{preview.data.mediaIds.length - 1}</span>
            )}
            </>
          ) : <span className="place__popup-placeholder" aria-hidden="true">{place.markerIcon}</span>}
        </div>
        <strong>{place.name}</strong>
        {place.address && <small>{place.address}</small>}
        <small className="place__popup-author">{t("By {username}", { username: place.owner.username })}</small>
        <StarRating value={place.rating} size="sm" />
      </button>}
    </div>
  );
}

function PlaceClusterMarker({ group, selectedId, onSelect, canChange, onMove, onDelete, homeExpanded, nearHome, onHomeHoverChange, hidePreview }: {
  homeExpanded: boolean;
  nearHome: boolean;
  onHomeHoverChange?: (hovered: boolean) => void;
  group: MapMarkerGroup<Place>;
  selectedId: string | null;
  onSelect: (place: Place) => void;
  hidePreview: boolean;
} & Pick<Props, "canChange" | "onMove" | "onDelete">) {
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

  return (
    <div className={`place__cluster${count > 1 ? " place__cluster--group" : ""}`} data-open={expanded}
      data-home-expanded={homeExpanded} data-near-home={nearHome} data-selected={selectedIndex >= 0}
      style={{ "--fan-count": visiblePlaces.length, "--fan-step": `${step}deg`, "--counter-color": nearHome ? "#000" : `color-mix(in srgb, ${ordered[0].markerColor || "#30353b"}, black 35%)` } as CSSProperties}
      onPointerEnter={() => { setOpen(true); onHomeHoverChange?.(true); }}
      onPointerLeave={() => { setOpen(false); onHomeHoverChange?.(false); }}
      onFocus={() => { setOpen(true); onHomeHoverChange?.(true); }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); onHomeHoverChange?.(false); } }}
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
            <PlaceMarker place={place} selected={place.id === selectedId} onSelect={onSelect}
              canChange={canChange} onMove={onMove} onDelete={onDelete} hidePreview={hidePreview} />
          </div>
        );
      })}
      {count > 1 && (
        <span className="place__cluster-count" aria-label={toggleLabel}>{count}</span>
      )}
      {expanded && pageCount > 1 && <button type="button" className="place__cluster-next"
        aria-label={t("Show next markers")} title={t("Show next markers")}
        onClick={(event) => { event.stopPropagation(); setPage((current) => (current + 1) % pageCount); }}>
        {currentPage + 1}/{pageCount} ›
      </button>}
    </div>
  );
}

function PlaceMarkers({ places, selectedId, ready, onSelect, canChange, onMove, onDelete, homeLocation, homeHovered, onHomeHoverChange, hidePreview }: {
  homeLocation: HomeLocation | null;
  homeHovered: boolean;
  onHomeHoverChange: (hovered: boolean) => void;
  hidePreview: boolean;
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
        return (
        <Fragment key={group.items[0].id}>
        <Marker
          latitude={nearHome && homeLocation ? homeLocation.latitude : group.location.latitude}
          longitude={nearHome && homeLocation ? homeLocation.longitude : group.location.longitude}
          anchor="bottom"
          style={{ zIndex: Math.round((project?.(nearHome && homeLocation ? homeLocation : group.location).y ?? 0) * 10) }}
          onClick={(event) => event.originalEvent.stopPropagation()}
        >
          <PlaceClusterMarker group={group} selectedId={selectedId} onSelect={onSelect}
            homeExpanded={homeExpanded} nearHome={nearHome}
            hidePreview={hidePreview}
            onHomeHoverChange={homeExpanded ? onHomeHoverChange : undefined}
            canChange={canChange} onMove={onMove} onDelete={onDelete} />
        </Marker>
        {nearHome && homeLocation && (group.items.length === 1 || !homeExpanded) && (
          <Marker latitude={homeLocation.latitude} longitude={homeLocation.longitude} anchor="bottom"
            style={{ zIndex: Math.round((project?.(homeLocation).y ?? 0) * 10) + 2, pointerEvents: "none" }}>
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

function MapContent({
  places, photos = [], selectedPhoto, photoRelocating = false, selectedId, draft, picking, editorOpen, relocatingPlace, homeLocation,
  homeLocationReady, homePicking, homeActionDisabled, onSelect, onPick, onPickHome,
  onHomeClick, onCreateAtCurrentLocation, onAddPhotos, token,
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
    else if (showPhotoMarkers) onAddPhotos();
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
  const showAddToolbar = !loaded || homePicking || (picking && (!!selected || !draft)) || (!selected && !selectedPhoto && !draft && !editorOpen);
  const addDisabled = !loaded || homePicking || homeActionDisabled || (!showMarkers && !showPhotoMarkers);
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
    if (homePicking) onPickHome(coordinate);
    else onPick(coordinate, result.placeName, "search");
  };

  if (failed)
    return <>
      <ErrorState message="Mapbox could not load. Check internet access, WebGL support, the public access token, account billing, and allowed website URLs. Places can only be placed on the map." />
      {selected && <NavigationFallback destination={{ ...selected, name: selected.name }} />}
    </>;

  return (
    <div className="place__map map-controls" data-scene={scene} data-mapbox-preview={mapboxPreview} data-relocating={relocating || undefined} role="region" aria-label={t("Places map")}>
      <Map
        style={{ minHeight: "inherit" }}
        ref={mapRef}
        mapboxAccessToken={token}
        attributionControl={false}
        mapStyle="mapbox://styles/mapbox/standard"
        config={{ basemap: getMapAppearanceConfig(mapAppearance.lighting, mapAppearance.colorTheme, scene === "3d") }}
        initialViewState={{ latitude: 20, longitude: 0, zoom: 2, pitch: 0, bearing: 0 }}
        cursor={picking || homePicking || relocating ? "crosshair" : undefined}
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
          if (photoRelocating) {
            onMovePhoto(selectedPhoto!, point);
            return;
          }
          if (relocating) {
            onPick(point);
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
          show3dObjects={scene === "3d"}
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
            else if (!relocating) onPick(coordinate);
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
        <MapCameraScene scene={scene} selected={selected}
          draft={selectedPhoto?.location ? { latitude: selectedPhoto.location.latitude, longitude: selectedPhoto.location.longitude } : draft}
          ready={loaded && !navigationOpen}
          homeLocation={homeLocation} homeRequest={homeRequest} focusRequest={focusRequest} />
        <MapResizer />
        {loaded && !homePicking && (selected && !picking || selectedPhoto && !picking || !selected && !selectedPhoto && (picking || relocating || editorOpen) && draft) && (
          <MapNavigation destination={selected
            ? { latitude: selected.latitude, longitude: selected.longitude, name: selected.name }
            : selectedPhoto ? { latitude: (photoRelocating && draft ? draft : selectedPhoto.location!).latitude, longitude: (photoRelocating && draft ? draft : selectedPhoto.location!).longitude, name: selectedPhoto.originalFilename }
            : { ...draft!, name: relocatingPlace?.name ?? t("New place") }}
            accessToken={token} homeLocation={homeLocation} onMapboxPreviewChange={setMapboxPreview}
            onEdit={selected
              ? canChange(selected) ? () => onEdit(selected) : undefined
              : selectedPhoto ? photoRelocating ? onConfirmPhotoMove : canMovePhoto(selectedPhoto) ? () => onEditPhoto(selectedPhoto) : undefined
              : relocating ? onConfirmRelocation : () => { if (draft) focusCoordinate(draft); onEditDraft(); }}
            onOpenChange={(open) => {
              if (open && !selected && !selectedPhoto && draft) focusCoordinate(draft);
              setNavigationOpen(open);
            }}
            editAction={photoRelocating || relocatingPlace || (!selected && !selectedPhoto) ? "confirm" : "edit"}
            onCancel={photoRelocating ? onCancelSelection : relocatingPlace ? onCancelRelocation : selected || selectedPhoto ? onCancelSelection : onCancelDraft} />
        )}
        {homeLocation && !relocating && (
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
        {showMarkers && !photoRelocating && (
          <PlaceMarkers places={mapPlaces} selectedId={selectedId} ready={loaded}
            homeLocation={homeLocation} homeHovered={homeHovered} onHomeHoverChange={onHomeHoverChange}
            hidePreview={mapboxPreview || relocating}
            canChange={(place) => !navigationOpen && !relocating && canChange(place)} onMove={onMove} onDelete={onDelete} onSelect={(item) => {
            if (relocating) return;
            setFocusRequest((request) => request + 1);
            onSelect(item);
          }} />
        )}
        {showPhotoMarkers && <PhotoMarkers
          media={photoRelocating && selectedPhoto ? photos.filter((item) => item.id === selectedPhoto.id) : photos}
          selected={selectedPhoto} ready={loaded} homeLocation={homeLocation} homeHovered={homeHovered}
          onHomeHoverChange={onHomeHoverChange} hidePreview={mapboxPreview || photoRelocating}
          onSelect={(photo) => {
            if (selectedPhoto?.id !== photo.id) setFocusRequest((request) => request + 1);
            onSelectPhoto(photo);
          }}
          canMove={(photo) => !navigationOpen && canMovePhoto(photo)} onMove={onMovePhoto} />}
        {draft && (picking || !!relocatingPlace || photoDraftChanged) && (
          <MapDraftMarker location={draft} label={t("Click the map or drag to set a location")}
            draggable={picking || relocating} onPick={onPick}
            onClick={picking ? onCancelDraft : undefined} />
        )}
      </Map>
      <MapLoadingOverlay ready={loaded} closeDelay={250} className="map-loading-overlay" />
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
      {addChoiceOpen && <PlaceDialog title={t("Add")} onClose={() => setAddChoiceOpen(false)}>
        <div className="place__add-choices">
          <Button onClick={() => { setAddChoiceOpen(false); onAddPhotos(); }}>{t("Add photos")}</Button>
          <Button onClick={() => { setAddChoiceOpen(false); addPlace(); }}>{t("Add place")}</Button>
        </div>
      </PlaceDialog>}
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
              onClick={() => { if (settingsRef) settingsRef.current.scene = "streets"; setScene("streets"); }}>
              <span className="place__scene-icon" aria-hidden="true"><Home size={20} /></span>
              <span className="place__scene-copy"><strong>{t("Street map")}</strong></span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="place__scene" aria-pressed={scene === "3d"}
              onClick={() => {
                mapAppearance.selectLighting("day");
                mapAppearance.selectColorTheme("default");
                if (settingsRef) settingsRef.current.scene = "3d";
                setScene("3d");
              }}>
              <span className="place__scene-icon" aria-hidden="true"><Globe size={20} animation="spin" /></span>
              <span className="place__scene-copy"><strong>{t("3D Basemap")}</strong></span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="place__scene" aria-pressed={showPhotoMarkers}
              onClick={() => {
                const next = !showPhotoMarkers;
                if (settingsRef) { settingsRef.current.showPhotoMarkers = next; if (next) settingsRef.current.showMarkers = false; }
                setShowPhotoMarkers(next);
                if (next) setShowMarkers(false);
              }}>
              <span className="place__scene-icon" aria-hidden="true"><MapPin size={20} /></span>
              <span className="place__scene-copy"><strong>{t("Photos")}</strong></span>
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="place__scene" aria-pressed={showMarkers}
              onClick={() => {
                const next = !showMarkers;
                if (settingsRef) { settingsRef.current.showMarkers = next; if (next) settingsRef.current.showPhotoMarkers = false; }
                setShowMarkers(next);
                if (next) setShowPhotoMarkers(false);
              }}>
              <span className="place__scene-icon" aria-hidden="true"><Key size={20} /></span>
              <span className="place__scene-copy"><strong>{t("Places")}</strong></span>
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
