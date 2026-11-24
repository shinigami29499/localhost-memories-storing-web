import { useCallback, type KeyboardEvent, type MouseEvent } from "react";
import { Link, type LinkProps, type Location, useLocation, useNavigate, useNavigation } from "react-router-dom";
import { useAnimationStore } from "@/store/animationStore";

type PageEntry = { fromKey: string; fromPathname?: string; homeIndex?: number };
export type MobileAlbumCreateEntry = { albumDate: string; listLocationKey: string };
type PageState = { mobileEntry?: PageEntry; mobileAlbumCreate?: MobileAlbumCreateEntry };
type OpenPageOptions = { beforeNavigate?: () => void; replace?: boolean };

const entries = new Map<string, PageEntry>();
const historyIndex = () => Number(window.history.state?.idx ?? 0);
const pageState = (location: Location) => location.state as PageState | null;
const entryFor = (location: Location) => pageState(location)?.mobileEntry ?? entries.get(location.key);

export function mobileSection(pathname: string) {
  const segment = pathname.split("/")[1];
  if (segment === "album") return "gallery";
  if (segment === "user" || segment === "users") return "users";
  return segment === "location" ? segment : null;
}

export const isMobileAlbumDetail = (pathname: string) => /^\/album\/[^/]+\/?$/.test(pathname);
const isGalleryList = (pathname: string) => /^\/album\/?$/.test(pathname);
const albumTransitionEnabled = () => useAnimationStore.getState().enabled
  && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function rememberMobilePageEntry(previous: Location, next: Location, pop: boolean) {
  if (pop || (previous.pathname === next.pathname &&
    (pageState(previous)?.mobileAlbumCreate || pageState(next)?.mobileAlbumCreate))) return;
  const previousEntry = entryFor(previous);
  const nextEntry = pageState(next)?.mobileEntry;
  const section = mobileSection(next.pathname);
  const samePage = next.pathname === previous.pathname || (section && section === mobileSection(previous.pathname));

  if (!nextEntry && previousEntry && samePage) {
    entries.set(next.key, previousEntry);
  }
}

export function useOpenMobilePage() {
  const location = useLocation();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const returnHome = useReturnFromMobilePage();
  return (to: string, event?: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>, options?: OpenPageOptions) => {
    if (event && (event.defaultPrevented || ("button" in event && event.button !== 0)
      || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    event?.preventDefault();
    options?.beforeNavigate?.();
    if (to === location.pathname + location.search + location.hash) {
      if (navigation.state === "loading") void navigate(to, { replace: true, state: location.state });
      return;
    }
    if (to === "/" && location.pathname !== "/") {
      returnHome();
      return;
    }
    const currentIndex = historyIndex();
    const openingFromHome = location.pathname === "/";
    const homeIndex = openingFromHome ? currentIndex : entryFor(location)?.homeIndex;
    const mobileEntry = { fromKey: location.key, fromPathname: location.pathname, homeIndex };
    const replace = options?.replace ?? (!openingFromHome && !mobileSection(location.pathname) && homeIndex === currentIndex - 1);
    const viewTransition = isGalleryList(location.pathname) && isMobileAlbumDetail(to) && albumTransitionEnabled();
    void navigate(to, { replace, state: { mobileEntry }, viewTransition });
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
      void navigate("/", { replace: true });
    }
  }, [location, navigate]);
}

export function useMobileBack() {
  const location = useLocation();
  const navigate = useNavigate();
  const returnHome = useReturnFromMobilePage();
  return useCallback(() => {
    if (pageState(location)?.mobileAlbumCreate) {
      void navigate(-1);
    } else if (!isMobileAlbumDetail(location.pathname)) {
      returnHome();
    } else if (isGalleryList(entryFor(location)?.fromPathname ?? "") && historyIndex() > 0) {
      void navigate(-1);
    } else {
      void navigate("/album", { replace: true, viewTransition: albumTransitionEnabled() });
    }
  }, [location, navigate, returnHome]);
}
