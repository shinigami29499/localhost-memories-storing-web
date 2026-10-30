import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Map, { Marker, useMap } from "react-map-gl/mapbox";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import "mapbox-gl/dist/mapbox-gl.css";
import { ErrorState, Spinner } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { MapPin } from "../../../components/animate-ui/icons/map-pin";
import { Globe } from "../../../components/animate-ui/icons/globe";
import { Home } from "../../../components/animate-ui/icons/home";
import { Settings } from "../../../components/animate-ui/icons/settings";
import { ChevronDown } from "../../../components/animate-ui/icons/chevron-down";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import type { MediaFile, PhotoLocation, PickedLocation } from "../../media/types";
import { findPlaceAt } from "../utils/findPlaceAt";

interface Props {
  media: MediaFile[];
  selected: MediaFile | undefined;
  draft: PickedLocation | null;
  editable: boolean;
  onSelect: (media: MediaFile) => void;
  onPick: (location: PickedLocation) => void;
}

function MapViewport({ media, selected, ready }: Pick<Props, "media" | "selected"> & { ready: boolean }) {
  const { current: map } = useMap();
  useEffect(() => {
    if (!map || !ready || selected?.location) return;
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
  }, [map, ready, media, selected?.location]);

  useEffect(() => {
    if (map && ready && selected?.location) {
      map.jumpTo({
        center: [selected.location.longitude, selected.location.latitude],
        zoom: Math.max(map.getZoom(), 12),
      });
    }
  }, [map, ready, selected?.id, selected?.location]);
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

function MapCameraScene({ scene, selected, ready }: { scene: MapScene; selected: MediaFile | undefined; ready: boolean }) {
  const shouldReduceMotion = useShouldReduceMotion();
  const { current: map } = useMap();
  useEffect(() => {
    if (!map || !ready) return;
    map.easeTo({
      ...(scene === "3d" && selected?.location
        ? {
            center: [selected.location.longitude, selected.location.latitude] as [number, number],
            zoom: Math.max(map.getZoom(), 15),
          }
        : {}),
      pitch: scene === "3d" ? 55 : 0,
      bearing: scene === "3d" ? -20 : 0,
      duration: shouldReduceMotion ? 0 : 400,
    });
  }, [map, ready, scene, selected?.id, selected?.location, shouldReduceMotion]);
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

function PhotoClusterMarker({ cluster, selected, onSelect }: {
  cluster: PhotoCluster;
  selected: MediaFile | undefined;
  onSelect: (media: MediaFile) => void;
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
          <button type="button" className="locations__pin" title={item.originalFilename}
            aria-label={item.originalFilename} aria-pressed={selected?.id === item.id}
            onClick={() => onSelect(item)}>
            <img src={mediaPreviewUrl(item.id)} alt="" loading="lazy" />
          </button>
          <article className="locations__popup" aria-label={item.originalFilename}>
            <img src={mediaPreviewUrl(item.id)} alt={item.originalFilename} loading="lazy" />
            <div>
              <strong>{item.originalFilename}</strong>
              <small>{item.location.latitude.toFixed(5)}, {item.location.longitude.toFixed(5)}</small>
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

function PhotoMarkers({ media, selected, ready, onSelect }: Pick<Props, "media" | "selected" | "onSelect"> & { ready: boolean }) {
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
          <PhotoClusterMarker cluster={cluster} selected={selected} onSelect={onSelect} />
        </Marker>
      ))}
    </>
  );
}

function MapContent({ media, selected, draft, editable, onSelect, onPick, token }: Props & { token: string }) {
  const { t } = useLocale();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapScene>("3d");
  const [showMarkers, setShowMarkers] = useState(true);
  const located = useMemo(() => media.filter((item) => item.location), [media]);
  const styleUrl = mapStyle === "3d"
    ? "mapbox://styles/mapbox/standard"
    : "mapbox://styles/mapbox/streets-v12";
  if (failed)
    return <ErrorState message="Mapbox could not load. Check internet access, WebGL support, the public access token, account billing, and allowed website URLs. Photo locations can only be set on the map." />;

  return (
    <div className="locations__map" role="region" aria-label={t("Photo locations")}>
      {!loaded && <div className="locations__map-loading"><Spinner label="Loading map…" /></div>}
      <Map
        style={{ minHeight: "inherit" }}
        mapboxAccessToken={token}
        mapStyle={styleUrl}
        initialViewState={{ latitude: 20, longitude: 0, zoom: 2, pitch: 55, bearing: -20 }}
        cooperativeGestures
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        onClick={(event) => {
          if (editable) {
            const place = findPlaceAt(event, mapStyle === "3d" ? "standard" : "classic");
            const point = event.lngLat.wrap();
            onPick(place ?? { latitude: point.lat, longitude: point.lng });
          }
        }}
      >
        <MapViewport media={media} selected={selected} ready={loaded} />
        <MapCameraScene scene={mapStyle} selected={selected} ready={loaded} />
        <MapResizer />
        {showMarkers && <PhotoMarkers media={located} selected={selected} ready={loaded} onSelect={onSelect} />}
        {editable && draft && (
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
      <details className="locations__scenes" aria-label={t("Map scenes")}>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <summary className="locations__scenes-title">
            <Settings size={18} aria-hidden="true" />
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
    </div>
  );
}

export function LocationMap(props: Props) {
  const { t } = useLocale();
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();
  if (!token)
    return <p className="locations__map-message" role="status">{t("Set VITE_MAPBOX_ACCESS_TOKEN to enable Mapbox. Photo locations can only be set on the map.")}</p>;
  if (!token.startsWith("pk."))
    return <ErrorState message="Mapbox requires a public access token starting with pk. Never use a secret token in the frontend." />;
  return <MapContent key={token} {...props} token={token} />;
}
