import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { useMap } from "react-map-gl/mapbox";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useNavigation } from "../hooks/useNavigation";
import type { Coordinate, NavigationDestination } from "../services/directionsService";
function getNavigationPortal() {
  return document.querySelector<HTMLElement>(".app-shell") ?? document.body;
}

interface Props {
  destination: NavigationDestination;
  accessToken: string;
  homeLocation?: Coordinate | null;
  onOpenChange: (open: boolean) => void;
  onMapboxPreviewChange?: (previewing: boolean) => void;
  onEdit?: () => void;
  editAction?: "edit" | "add" | "confirm";
  onCancel?: () => void;
}

export function useNavigationSession({ destination, accessToken, homeLocation, onOpenChange, onMapboxPreviewChange, onEdit, editAction, onCancel, name }: Props & { name: string }) {
  const { t, language } = useLocale();
  const { current: map } = useMap();
  const mobile = useMediaQuery("(max-width: 640px)");
  const shouldReduceMotion = useShouldReduceMotion();
  const navigation = useNavigation(destination, accessToken, language, homeLocation);
  const { route, position, tracking, loading, locating, error } = navigation;
  const [expanded, setExpanded] = useState(false);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const restoreFocus = useRef(false);
  const id = useId();
  const sourceId = `navigation-${id}`;
  const geometry = useMemo(() => route ? {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: route.coordinates },
  } : null, [route]);
  const busy = loading || locating;
  const gpsUnreliable = tracking && navigation.gpsUnreliable;

  useEffect(() => {
    onOpenChangeRef.current(expanded);
    if (!expanded && restoreFocus.current) {
      restoreFocus.current = false;
      getNavigationPortal().querySelector<HTMLButtonElement>(".map-navigation__trigger")?.focus();
    }
  }, [expanded]);
  useEffect(() => () => onOpenChangeRef.current(false), []);
  useEffect(() => {
    onMapboxPreviewChange?.(navigation.mapboxPreview);
  }, [navigation.mapboxPreview, onMapboxPreviewChange]);
  useEffect(() => () => onMapboxPreviewChange?.(false), [onMapboxPreviewChange]);

  useEffect(() => {
    if (!map || !route) return;
    const first = route.coordinates[0];
    let west = first[0], east = first[0], south = first[1], north = first[1];
    for (const [longitude, latitude] of route.coordinates) {
      // Frame the short crossing rather than the whole world at the antimeridian.
      const wrapped = first[0] + ((longitude - first[0] + 540) % 360) - 180;
      west = Math.min(west, wrapped);
      east = Math.max(east, wrapped);
      south = Math.min(south, latitude);
      north = Math.max(north, latitude);
    }
    const width = map.getContainer().clientWidth;
    map.fitBounds([[west, south], [east, north]], {
      padding: mobile
        ? { top: 72, bottom: Math.round(map.getContainer().clientHeight * 0.48), left: 32, right: 48 }
        : { top: 72, bottom: 64, left: Math.min(360, Math.round(width * 0.45)), right: 64 },
      maxZoom: 16,
      pitch: 0,
      bearing: 0,
      duration: shouldReduceMotion ? 0 : 400,
    });
  }, [map, route, mobile, shouldReduceMotion]);

  useEffect(() => {
    if (!map || !tracking || !position || gpsUnreliable) return;
    if (position.accuracy > 100 || Date.now() - position.timestamp > 30000) return;
    map.easeTo({
      center: [position.longitude, position.latitude],
      zoom: 16,
      pitch: 0,
      bearing: position.heading !== null && Number.isFinite(position.heading) ? position.heading : 0,
      padding: mobile
        ? { top: 64, bottom: Math.round(map.getContainer().clientHeight * 0.46), left: 16, right: 48 }
        : { top: 64, bottom: 64, left: Math.min(360, Math.round(map.getContainer().clientWidth * 0.45)), right: 64 },
      retainPadding: false,
      duration: 0,
    });
  }, [map, tracking, position, mobile, gpsUnreliable]);

  const close = () => {
    navigation.reset();
    restoreFocus.current = true;
    setExpanded(false);
  };
  return { t, map, navigation, route, position, tracking, loading, locating, error, expanded, setExpanded, id, sourceId, geometry, busy, gpsUnreliable, close };
}
