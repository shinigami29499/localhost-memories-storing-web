import { useCallback, type KeyboardEvent, type MouseEvent } from "react";
import type { Query, QueryCache } from "@tanstack/react-query";
import { Link, type LinkProps, type Location, useLocation, useNavigate } from "react-router-dom";
import { useAnimationStore } from "@/store/animationStore";

type PageEntry = { fromKey: string; fromPathname?: string; homeIndex?: number };
type PageState = { mobileEntry?: PageEntry; mobileReturn?: boolean };

export type MobilePageTransition = {
  locationKey: string;
  id: number;
  animateHandoff: boolean;
  queries: Set<Query>;
  stopTracking: () => void;
};

const entries = new Map<string, PageEntry>();
let activeTransition: MobilePageTransition | undefined;
let transitionId = 0;
const historyIndex = () => Number(window.history.state?.idx ?? 0);
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pageState = (location: Location) => location.state as PageState | null;
const entryFor = (location: Location) => pageState(location)?.mobileEntry ?? entries.get(location.key);

export function mobileSection(pathname: string) {
  const segment = pathname.split("/")[1];
  return segment === "gallery" || segment === "location" || segment === "users" ? segment : null;
}

export const isMobileAlbumDetail = (pathname: string) => /^\/gallery\/album\/[^/]+\/?$/.test(pathname);
const isGalleryList = (pathname: string) => /^\/gallery(?:\/album)?\/?$/.test(pathname);

export function getMobilePageTransition(locationKey: string) {
  return activeTransition?.locationKey === locationKey ? activeTransition : undefined;
}

export function updateMobilePageTransition(
  previous: Location, next: Location, pop: boolean, cache: QueryCache,
) {
  activeTransition?.stopTracking();
  activeTransition = undefined;
  const previousEntry = entryFor(previous);
  const nextEntry = pageState(next)?.mobileEntry;
  const section = mobileSection(next.pathname);
  const samePage = next.pathname === previous.pathname || (section && section === mobileSection(previous.pathname));

  if (!pop && !nextEntry && previousEntry && samePage) {
    entries.set(next.key, previousEntry);
  }

  if ((isGalleryList(previous.pathname) && isMobileAlbumDetail(next.pathname))
    || (isMobileAlbumDetail(previous.pathname) && isGalleryList(next.pathname))) return;

  const returning = pop
    ? previousEntry?.fromKey === next.key || (next.pathname === "/" && previousEntry?.homeIndex === historyIndex())
    : pageState(next)?.mobileReturn;
  const opening = nextEntry?.fromKey === previous.key;
  if ((!opening && !returning) || prefersReducedMotion()) return;

  const animateHandoff = useAnimationStore.getState().enabled;
  const queries = new Set<Query>();
  const stopTracking = cache.subscribe(({ type, query }) => {
    if (type === "observerAdded") queries.add(query);
  });
  activeTransition = { locationKey: next.key, id: ++transitionId, animateHandoff, queries, stopTracking };
}

export function useOpenMobilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const returnHome = useReturnFromMobilePage();
  return (to: string, event?: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>, beforeNavigate?: () => void) => {
    if (event && (event.defaultPrevented || ("button" in event && event.button !== 0)
      || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    event?.preventDefault();
    beforeNavigate?.();
    if (to === location.pathname + location.search + location.hash) return;
    if (to === "/" && location.pathname !== "/") {
      returnHome();
      return;
    }
    const currentIndex = historyIndex();
    const openingFromHome = location.pathname === "/";
    const homeIndex = openingFromHome ? currentIndex : entryFor(location)?.homeIndex;
    const mobileEntry = { fromKey: location.key, fromPathname: location.pathname, homeIndex };
    const replace = !openingFromHome && !mobileSection(location.pathname) && homeIndex === currentIndex - 1;
    void navigate(to, { replace, state: { mobileEntry } });
  };
}

type MobilePageLinkProps = Omit<LinkProps, "to" | "relative" | "replace" | "state" | "preventScrollReset" | "viewTransition">
  & { to: string };

export function MobilePageLink({ to, onClick, ...props }: MobilePageLinkProps) {
  const openPage = useOpenMobilePage();
  return <Link {...props} to={to} onClick={(event) => {
    onClick?.(event);
    if (!props.reloadDocument && (!props.target || props.target === "_self")) openPage(to, event);
  }} />;
}

export function useReturnFromMobilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  return useCallback(() => {
    if (location.pathname === "/") return;
    const homeIndex = entryFor(location)?.homeIndex;
    const delta = homeIndex === undefined ? 0 : homeIndex - historyIndex();
    if (delta < 0) {
      void navigate(delta);
    } else {
      void navigate("/", {
        replace: true,
        state: { mobileReturn: true },
      });
    }
  }, [location, navigate]);
}

export function useMobileBack() {
  const location = useLocation();
  const navigate = useNavigate();
  const returnHome = useReturnFromMobilePage();
  return useCallback(() => {
    if (!isMobileAlbumDetail(location.pathname)) {
      returnHome();
    } else if (isGalleryList(entryFor(location)?.fromPathname ?? "") && historyIndex() > 0) {
      void navigate(-1);
    } else {
      void navigate("/gallery", { replace: true });
    }
  }, [location, navigate, returnHome]);
}
