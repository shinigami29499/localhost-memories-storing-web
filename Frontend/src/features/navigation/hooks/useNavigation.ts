import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  getDirections,
  isCoordinate,
  type Coordinate,
  type NavigationDestination,
  type NavigationRoute,
  type TravelMode,
} from "../services/directionsService";
import { distanceBetween, routeProgress } from "../utils/routeProgress";

interface LocationFix extends Coordinate {
  accuracy: number;
  heading: number | null;
  timestamp: number;
}

const LOCATION_ERROR = "Could not determine your current location. Check location permission and try again.";
const ROUTE_ERROR = "Could not load directions. Check internet access, the Mapbox token, billing, and usage limits.";

function toFix(position: GeolocationPosition): LocationFix {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    heading: position.coords.heading,
    timestamp: position.timestamp,
  };
}

function isReliableFix(position: LocationFix): boolean {
  return isCoordinate(position) && Number.isFinite(position.accuracy)
    && position.accuracy >= 0 && position.accuracy <= 100
    && Number.isFinite(position.timestamp) && Date.now() - position.timestamp <= 30000;
}

export function useNavigation(
  destination: NavigationDestination,
  token: string,
  language: "en" | "vi",
) {
  const [mode, setMode] = useState<TravelMode>("driving");
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [position, setPosition] = useState<LocationFix | null>(null);
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsUnreliable, setGpsUnreliable] = useState(false);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const lastReroute = useRef(0);
  const mounted = useRef(true);
  const routing = useMutation({ mutationFn: getRoute, gcTime: 0, retry: false });

  async function getRoute({ origin, signal }: { origin: Coordinate; signal: AbortSignal }) {
    return getDirections(origin, destination, mode, token, language, signal);
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current++;
      controller.current?.abort();
    };
  }, []);

  const cancelRequest = () => {
    request.current++;
    controller.current?.abort();
    controller.current = null;
    setLoading(false);
    setLocating(false);
  };

  const loadRoute = async (origin: LocationFix, id: number, rerouting: boolean) => {
    const abort = new AbortController();
    controller.current = abort;
    let timedOut = false;
    const timer = window.setTimeout(() => { timedOut = true; abort.abort(); }, 15000);
    setLoading(true);
    try {
      const next = await routing.mutateAsync({ origin, signal: abort.signal });
      if (!mounted.current || request.current !== id) return;
      setRoute(next);
      setArrived(false);
      setError(null);
    } catch (failure) {
      if (!mounted.current || request.current !== id) return;
      const message = timedOut ? "Directions request timed out. Try again."
        : failure instanceof Error ? failure.message : ROUTE_ERROR;
      setError(message);
      // Do not continue giving guidance along a route that the user has left.
      if (rerouting) setTracking(false);
    } finally {
      window.clearTimeout(timer);
      if (mounted.current && request.current === id) {
        controller.current = null;
        setLoading(false);
      }
    }
  };

  const preview = () => {
    cancelRequest();
    setTracking(false);
    setRoute(null);
    setPosition(null);
    setArrived(false);
    setError(null);
    setGpsUnreliable(false);
    if (!navigator.geolocation) {
      setError(LOCATION_ERROR);
      return;
    }
    const id = request.current;
    setLocating(true);
    navigator.geolocation.getCurrentPosition((current) => {
      if (!mounted.current || request.current !== id) return;
      setLocating(false);
      const fix = toFix(current);
      if (!isReliableFix(fix)) {
        setError("GPS accuracy is too low. Move to an open area and try again.");
        return;
      }
      setPosition(fix);
      void loadRoute(fix, id, false);
    }, () => {
      if (!mounted.current || request.current !== id) return;
      setLocating(false);
      setError(LOCATION_ERROR);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  useEffect(() => {
    if (!tracking || !navigator.geolocation) return;
    let active = true;
    const watch = navigator.geolocation.watchPosition((current) => {
      if (!active) return;
      const fix = toFix(current);
      const reliable = isReliableFix(fix);
      setGpsUnreliable(!reliable);
      if (reliable) setPosition(fix);
    }, () => {
      if (!active) return;
      cancelRequest();
      setTracking(false);
      setError(LOCATION_ERROR);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    return () => {
      active = false;
      navigator.geolocation.clearWatch(watch);
    };
  }, [tracking]);

  useEffect(() => {
    if (!tracking || !position || !route || loading || gpsUnreliable || !isReliableFix(position)) return;
    const progress = routeProgress(route, position);
    const endpoint = route.coordinates[route.coordinates.length - 1];
    if (position.accuracy <= 35 && progress.remaining < 60
      && distanceBetween(position, { longitude: endpoint[0], latitude: endpoint[1] }) <= 35) {
      setArrived(true);
      setTracking(false);
      return;
    }
    if (progress.offRoute > Math.max(50, position.accuracy * 2)
      && Date.now() - lastReroute.current >= 15000) {
      lastReroute.current = Date.now();
      setError(null);
      void loadRoute(position, ++request.current, true);
    }
  }, [tracking, position, route, loading, gpsUnreliable]);

  const reset = () => {
    cancelRequest();
    setTracking(false);
    setRoute(null);
    setPosition(null);
    setArrived(false);
    setError(null);
    setGpsUnreliable(false);
  };

  return {
    mode,
    setMode: (next: TravelMode) => { reset(); setMode(next); },
    route,
    position,
    loading,
    locating,
    tracking,
    arrived,
    gpsUnreliable,
    error,
    preview,
    start: () => {
      setError(null);
      setGpsUnreliable(true);
      lastReroute.current = 0;
      setTracking(true);
    },
    stop: () => { cancelRequest(); setTracking(false); },
    reset,
  };
}
