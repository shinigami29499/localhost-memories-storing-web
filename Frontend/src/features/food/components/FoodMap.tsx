import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Map, { Marker, useMap } from "react-map-gl/mapbox";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import "mapbox-gl/dist/mapbox-gl.css";
import { ErrorState, Spinner } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { Globe } from "../../../components/animate-ui/icons/globe";
import { Home } from "../../../components/animate-ui/icons/home";
import { Settings } from "../../../components/animate-ui/icons/settings";
import { ChevronDown } from "../../../components/animate-ui/icons/chevron-down";
import { Utensils } from "../../../components/animate-ui/icons/utensils";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import { StarRating } from "./StarRating";
import { findPlaceAt } from "../../locations/utils/findPlaceAt";
import type { FoodCoordinate, FoodPlace } from "../types";

interface Props {
  places: FoodPlace[];
  selectedId: string | null;
  draft: FoodCoordinate | null;
  draftIcon: string;
  draftColor: string;
  picking: boolean;
  onSelect: (place: FoodPlace) => void;
  /** `placeName` is set when the click snapped to a basemap place label. */
  onPick: (coordinate: FoodCoordinate, placeName?: string) => void;
}

type MapScene = "streets" | "3d";

function MapViewport({ places, selected, ready }: {
  places: FoodPlace[];
  selected: FoodPlace | undefined;
  ready: boolean;
}) {
  const { current: map } = useMap();
  const fittedCount = useRef(-1);
  useEffect(() => {
    if (!map || !ready || selected || !places.length) return;
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
  }, [map, ready, places, selected]);

  useEffect(() => {
    if (!map || !ready || !selected) return;
    map.jumpTo({
      center: [selected.longitude, selected.latitude],
      zoom: Math.max(map.getZoom(), 13),
    });
  }, [map, ready, selected?.id, selected?.latitude, selected?.longitude]);
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
      pitch: scene === "3d" ? 55 : 0,
      bearing: scene === "3d" ? -20 : 0,
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
  places, selectedId, draft, draftIcon, draftColor, picking, onSelect, onPick, token,
}: Props & { token: string }) {
  const { t } = useLocale();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [scene, setScene] = useState<MapScene>("3d");
  const [showMarkers, setShowMarkers] = useState(true);
  const selected = useMemo(
    () => places.find((place) => place.id === selectedId),
    [places, selectedId],
  );

  if (failed)
    return <ErrorState message="Mapbox could not load. Check internet access, WebGL support, the public access token, account billing, and allowed website URLs. Food places can only be placed on the map." />;

  return (
    <div className="food__map" role="region" aria-label={t("Food places map")}>
      {!loaded && <div className="food__map-loading"><Spinner label="Loading map…" /></div>}
      <Map
        style={{ minHeight: "inherit" }}
        mapboxAccessToken={token}
        mapStyle={scene === "3d" ? "mapbox://styles/mapbox/standard" : "mapbox://styles/mapbox/streets-v12"}
        initialViewState={{ latitude: 20, longitude: 0, zoom: 2, pitch: 55, bearing: -20 }}
        cursor={picking ? "crosshair" : undefined}
        cooperativeGestures
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        onClick={(event) => {
          const place = findPlaceAt(event, scene === "3d" ? "standard" : "classic");
          if (place) {
            onPick({ latitude: place.latitude, longitude: place.longitude }, place.placeName);
            return;
          }
          const point = event.lngLat.wrap();
          onPick({ latitude: point.lat, longitude: point.lng });
        }}
      >
        <MapViewport places={places} selected={selected} ready={loaded} />
        <MapCameraScene scene={scene} selected={selected} ready={loaded} />
        <MapResizer />
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
