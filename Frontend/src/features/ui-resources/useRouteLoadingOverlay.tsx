import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigation } from "react-router-dom";
import { UI_TIMING } from "../../config/uiTiming";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useDismissStartupOverlay } from "./StartupLoadingBoundary";

const RouteLoading = createContext<{ path?: string; fromPath?: string; loading: boolean; exiting: boolean }>({ loading: false, exiting: false });

export function RouteLoadingProvider({ children, skipTransition }: {
  children: ReactNode;
  skipTransition?: (from: string, to: string) => boolean;
}) {
  const { pathname } = useLocation();
  const pendingPath = useNavigation().location?.pathname;
  const dismissStartup = useDismissStartupOverlay();
  const previousPath = useRef(pathname);
  const [overlay, setOverlay] = useState<{ path: string; fromPath: string; startedAt: number; exiting?: boolean }>();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const destination = pendingPath && pendingPath !== pathname ? pendingPath : undefined;
  const skipPending = destination !== undefined && skipTransition?.(pathname, destination);

  useLayoutEffect(() => {
    const from = previousPath.current;
    const target = destination ?? (from !== pathname ? pathname : undefined);
    previousPath.current = pathname;
    if (!target) return;
    if (destination ? skipPending : skipTransition?.(from, target)) {
      setOverlay(undefined);
    } else if (overlay?.path !== target) {
      dismissStartup?.();
      setOverlay({ path: target, fromPath: destination ? pathname : from, startedAt: performance.now() });
    }
  }, [destination, dismissStartup, overlay?.path, pathname, skipPending, skipTransition]);

  useLayoutEffect(() => {
    if (!overlay || destination) return;
    const advance = () => setOverlay((current) => {
      if (current !== overlay) return current;
      return overlay.exiting || reducedMotion ? undefined : { ...overlay, exiting: true };
    });
    const remaining = overlay.exiting
      ? (reducedMotion ? 0 : UI_TIMING.PAGE_HANDOFF_DURATION)
      : UI_TIMING.PAGE_TRANSITION_DURATION - (performance.now() - overlay.startedAt);
    if (remaining <= 0) {
      advance();
      return;
    }
    const timer = window.setTimeout(advance, Math.ceil(remaining));
    return () => window.clearTimeout(timer);
  }, [destination, overlay, reducedMotion]);

  return <RouteLoading.Provider value={{
    path: skipPending ? undefined : destination ?? overlay?.path,
    fromPath: skipPending ? undefined : destination ? pathname : overlay?.fromPath,
    loading: Boolean(destination && !skipPending),
    exiting: !destination && Boolean(overlay?.exiting),
  }}>
    {children}
  </RouteLoading.Provider>;
}

export function useRouteLoadingOverlay() {
  return useContext(RouteLoading);
}

export function useRouteOverlayFade(exiting: boolean) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!exiting || !overlayRef.current) return;
    const fade = overlayRef.current.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: UI_TIMING.PAGE_HANDOFF_DURATION,
      easing: "ease-out",
      fill: "forwards",
    });
    return () => fade.cancel();
  }, [exiting]);
  return overlayRef;
}
