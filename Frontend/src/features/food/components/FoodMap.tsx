import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Map, { GeolocateControl, Marker, useMap, type MapRef } from "react-map-gl/mapbox";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import "mapbox-gl/dist/mapbox-gl.css";
import { ErrorState, showToast, Spinner } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { Globe } from "../../../components/animate-ui/icons/globe";
import { Home } from "../../../components/animate-ui/icons/home";
import { Settings } from "../../../components/animate-ui/icons/settings";
import { ChevronDown } from "../../../components/animate-ui/icons/chevron-down";
import { Utensils } from "../../../components/animate-ui/icons/utensils";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import { StarRating } from "./StarRating";
import { LocationSearch } from "../../locations/components/LocationSearch";
import type { LocationSearchResult } from "../../locations/services/locationSearchService";
import { findPlaceAt } from "../../locations/utils/findPlaceAt";
import type { HomeLocation } from "../../locations/types";
import type { FoodCoordinate, FoodPlace } from "../types";

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
  onSelect: (place: FoodPlace) => void;
  onPickHome: (coordinate: HomeLocation) => void;
  onRequestHomePick: () => void;
  onHomeMarkerClick: () => void;
  onHomeUnavailable: () => void;
  /** `placeName` is set when the click snapped to a basemap place label. */
  onPick: (coordinate: FoodCoordinate, placeName?: string) => void;
}

type MapScene = "streets" | "3d";

function MapViewport({ places, selected, ready, allowFit }: {
  places: FoodPlace[];
  selected: FoodPlace | undefined;
  ready: boolean;
  allowFit: boolean;
}) {
  const { current: map } = useMap();
  const fittedCount = useRef(-1);
  useEffect(() => {
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
    });
  }, [map, ready, selected?.id, selected?.latitude, selected?.longitude]);
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
  const started = useRef(false);
  const centered = useRef(false);

  useEffect(() => {
    if (!map || !ready || !homeLocationReady) return;
    const center = (location: HomeLocation) => {
      map.easeTo({ center: [location.longitude, location.latitude], zoom: 14, duration: 0 });
      centered.current = true;
      onResolved(true);
    };
    if (started.current) {
      if (!centered.current && homeLocation) center(homeLocation);
      return;
    }

    started.current = true;
    const fallback = () => {
      if (homeLocation) center(homeLocation);
      else onResolved(false);
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

function MapCameraScene({ scene, selected, ready }: {
  scene: MapScene;
  selected: FoodPlace | undefined;
  ready: boolean;
}) {
  const shouldReduceMotion = useShouldReduceMotion();
  const { current: map } = useMap();
  useEffect(() => {
    if (!map || !ready) return;
    map.easeTo({
      ...(scene === "3d" && selected
        ? {
            center: [selected.longitude, selected.latitude] as [number, number],
            zoom: Math.max(map.getZoom(), 15),
          }
        : {}),
      pitch: scene === "3d" && selected ? 55 : 0,
      bearing: scene === "3d" && selected ? -20 : 0,
      duration: shouldReduceMotion ? 0 : 400,
    });
  }, [map, ready, scene, selected?.id, shouldReduceMotion]);
  return null;
}

function FoodPlaceMarker({ place, selected, onSelect }: {
  place: FoodPlace;
  selected: boolean;
  onSelect: (place: FoodPlace) => void;
}) {
  return (
    <div className="food__marker" data-selected={selected}>
      <button
        type="button"
        className="food__pin"
        style={{ "--marker-color": place.markerColor } as CSSProperties}
        title={place.name}
        aria-label={place.name}
        aria-pressed={selected}
        onClick={() => onSelect(place)}
      >
        <span aria-hidden="true">{place.markerIcon}</span>
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
      </article>
    </div>
  );
}

function MapContent({
  places, selectedId, draft, draftIcon, draftColor, picking, homeLocation,
  homeLocationReady, homePicking, onSelect, onPick, onPickHome, onRequestHomePick,
  onHomeMarkerClick, onHomeUnavailable, token,
}: Props & { token: string }) {
  const { t } = useLocale();
  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [initialLocationResolved, setInitialLocationResolved] = useState(false);
  const [hasInitialCenter, setHasInitialCenter] = useState(false);
  const [scene, setScene] = useState<MapScene>("3d");
  const [showMarkers, setShowMarkers] = useState(true);
  const resolveInitialLocation = useCallback((hasCenter: boolean) => {
    setHasInitialCenter(hasCenter);
    setInitialLocationResolved(true);
  }, []);
  const selected = useMemo(
    () => places.find((place) => place.id === selectedId),
    [places, selectedId],
  );

  const selectSearchResult = (result: LocationSearchResult) => {
    mapRef.current?.easeTo({
      center: [result.longitude, result.latitude],
      zoom: 15,
      duration: 400,
    });
    const coordinate = { latitude: result.latitude, longitude: result.longitude };
    if (homePicking) onPickHome(coordinate);
    else onPick(coordinate, result.placeName);
  };

  if (failed)
    return <ErrorState message="Mapbox could not load. Check internet access, WebGL support, the public access token, account billing, and allowed website URLs. Food places can only be placed on the map." />;

  return (
    <div className="food__map" role="region" aria-label={t("Food places map")}>
      {!loaded && <div className="food__map-loading"><Spinner label="Loading map…" /></div>}
      <Map
        style={{ minHeight: "inherit" }}
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle={scene === "3d" ? "mapbox://styles/mapbox/standard" : "mapbox://styles/mapbox/streets-v12"}
        initialViewState={{ latitude: 20, longitude: 0, zoom: 2, pitch: 0, bearing: 0 }}
        cursor={picking || homePicking ? "crosshair" : undefined}
        cooperativeGestures
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        onClick={(event) => {
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
        <GeolocateControl
          position="bottom-right"
          positionOptions={{ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }}
          trackUserLocation={false}
          showUserLocation={false}
          onGeolocate={(event) => {
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
          ready={loaded}
          onResolved={resolveInitialLocation}
        />
        <MapViewport
          places={places}
          selected={selected}
          ready={loaded}
          allowFit={initialLocationResolved && !hasInitialCenter}
        />
        <MapCameraScene scene={scene} selected={selected} ready={loaded} />
        <MapResizer />
        {homeLocation && (
          <Marker
            latitude={homeLocation.latitude}
            longitude={homeLocation.longitude}
            anchor="bottom"
            onClick={(event) => event.originalEvent.stopPropagation()}
          >
            <button
              type="button"
              className="food__home-pin"
              aria-label={t("Home location")}
              title={t("Home location")}
              onClick={onHomeMarkerClick}
            >
              <Home size={18} aria-hidden="true" />
            </button>
          </Marker>
        )}
        {showMarkers && places.map((place) => (
          <Marker
            key={place.id}
            latitude={place.latitude}
            longitude={place.longitude}
            anchor="bottom"
            style={{ zIndex: place.id === selectedId ? 2 : 1 }}
            onClick={(event) => event.originalEvent.stopPropagation()}
          >
            <FoodPlaceMarker place={place} selected={place.id === selectedId} onSelect={onSelect} />
          </Marker>
        ))}
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
        accessToken={token}
        disabled={!loaded}
        onSelect={selectSearchResult}
      />
      <button
        type="button"
        className="food__map-home-control"
        aria-label={t(homeLocation ? "Go to home" : "Home location not set")}
        title={t(homeLocation ? "Go to home" : "Home location not set")}
        disabled={!loaded || !homeLocationReady}
        onClick={() => {
          if (homeLocation) {
            mapRef.current?.easeTo({
              center: [homeLocation.longitude, homeLocation.latitude],
              zoom: 14,
              duration: 400,
            });
          } else {
            onHomeUnavailable();
          }
        }}
      >
        <Home size={18} aria-hidden="true" />
      </button>
      <details className="food__scenes" aria-label={t("Map scenes")}>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <summary className="food__scenes-title">
            <Settings size={18} aria-hidden="true" />
            <span>{t("Setting")}</span>
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
    </div>
  );
}

export function FoodMap(props: Props) {
  const { t } = useLocale();
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
  if (!token)
    return <p className="food__map-message" role="status">{t("Set VITE_MAPBOX_ACCESS_TOKEN to enable Mapbox. Food places can only be placed on the map.")}</p>;
  if (!token.startsWith("pk."))
    return <ErrorState message="Mapbox requires a public access token starting with pk. Never use a secret token in the frontend." />;
  return <MapContent key={token} {...props} token={token} />;
}
