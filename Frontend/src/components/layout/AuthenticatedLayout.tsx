import { SwappingText } from "@animate-ui/react/primitives/texts/swapping";
import { useAnimationStore } from "../../store/animationStore";
import { Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PushTransition } from "../../hooks/PushTransition";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Sidebar } from "./Sidebar";
import { BottomNavigation } from "./BottomNavigation";
import { NotificationBell } from "./NotificationBell";
import { UploadRuntime } from "../../features/uploads/components/UploadRuntime";
import { PresenceRuntime } from "../../features/users/components/PresenceRuntime";
import { useLocale } from "../../context/LocaleContext";
import { Spinner } from "../ui";
import { PageActionBarProvider } from "./PageActionBar";

export const MOBILE_QUERY = "(max-width: 767px)";

function pageTitle(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/gallery/album/")) return "Album";
  if (pathname.startsWith("/gallery/favorites")) return "Favorites";
  if (pathname.startsWith("/gallery/album")) return "Album";
  if (pathname.startsWith("/gallery/trash")) return "Trash";
  if (pathname.startsWith("/gallery")) return "Gallery";
  if (pathname.startsWith("/location/travel")) return "Travel";
  if (pathname.startsWith("/location/history")) return "History";
  if (pathname.startsWith("/location/saved")) return "Saved";
  if (pathname.startsWith("/location")) return "Locations";
  if (pathname.startsWith("/uploads")) return "Upload";
  if (pathname.startsWith("/users")) return "Users";
  if (pathname.startsWith("/profile")) return "User profile";
  return "Settings";
}

export function AuthenticatedLayout() {
  const { t } = useLocale();
  const location = useLocation();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const motionEnabled = useAnimationStore((state) => state.enabled);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const showHeading = location.pathname !== "/" && !location.pathname.startsWith("/gallery/album/");
  const pageKey = /^\/gallery(?:\/favorites|\/trash|\/album)?\/?$/.test(location.pathname) ? "/gallery"
    : /^\/location(?:\/saved|\/history)?\/?$/.test(location.pathname) ? "/location"
    : /^\/users(?:\/pending|\/blocked)?\/?$/.test(location.pathname) ? "/users" : location.pathname;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-shell${sidebarCollapsed && !isMobile ? " app-shell--sidebar-collapsed" : ""}`} data-state={sidebarCollapsed && !isMobile ? "collapsed" : "expanded"}>
      <a className="skip-link" href="#main-content">{t("Skip to content")}</a>
      {!isMobile && <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />}
      <div className="app-shell__main">
        <PresenceRuntime />
        <UploadRuntime />
        <header className="app-topbar">
          <span className="app-topbar__title" role={showHeading ? "heading" : undefined} aria-level={showHeading ? 1 : undefined}>
            {motionEnabled && !reducedMotion ? <SwappingText text={t(pageTitle(location.pathname))} stagger={0.025} /> : t(pageTitle(location.pathname))}
          </span>
          <NotificationBell />
        </header>
        <PageActionBarProvider>
          <div id="main-content" tabIndex={-1} className="app-shell__content">
            <PushTransition transitionKey={pageKey} matchPageHighlights hasPageHighlight={pageKey === "/gallery" || pageKey === "/location" || pageKey === "/users"} />
            <Suspense fallback={<Spinner />}><Outlet /></Suspense>
          </div>
        </PageActionBarProvider>
      </div>
      {isMobile && <BottomNavigation />}
    </div>
  );
}
