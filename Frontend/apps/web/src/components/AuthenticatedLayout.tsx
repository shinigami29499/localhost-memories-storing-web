import { SwappingText } from "@animate-ui/react/primitives/texts/swapping";
import { useAnimationStore } from "@/store/animationStore";
import { Suspense, useState } from "react";
import { Outlet, useLocation, useNavigation } from "react-router-dom";
import { useUiRouteProgress } from "@/features/ui-resources/uiRoute";
import { useRouteLoadingOverlay, useRouteOverlayFade } from "@/features/ui-resources/useRouteLoadingOverlay";
import { UiResourceProgress } from "@/features/ui-resources/UiResourceProgress";
import { PushTransition } from "@/hooks/PushTransition";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { UploadRuntime } from "@/features/uploads/components/UploadRuntime";
import { PresenceRuntime } from "@/features/users/components/PresenceRuntime";
import { useLocale } from "@/context/LocaleContext";
import { Spinner } from "@/components/ui";
import { PageActionBarProvider } from "@/components/layout/PageActionBar";
import { ApprovalNotice } from "@/features/users/components/ApprovalNotice";

export const MOBILE_QUERY = "(max-width: 767px)";

function pageTitle(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname === "/album" || pathname.startsWith("/album/")) return "Album";
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
  const navigation = useNavigation();
  const destination = navigation.location?.pathname;
  const { path: overlayPath, loading, exiting } = useRouteLoadingOverlay();
  const overlayRef = useRouteOverlayFade(exiting);
  const covered = loading && Boolean(overlayPath);
  const progress = useUiRouteProgress(overlayPath);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const motionEnabled = useAnimationStore((state) => state.enabled);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const showHeading = location.pathname !== "/" && !location.pathname.startsWith("/album/");
  const pageKey = /^\/album\/?$/.test(location.pathname) ? "/album"
    : /^\/location(?:\/saved|\/history)?\/?$/.test(location.pathname) ? "/location"
    : /^\/users(?:\/pending|\/blocked)?\/?$/.test(location.pathname) ? "/users" : location.pathname;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-shell${sidebarCollapsed && !isMobile ? " app-shell--sidebar-collapsed" : ""}`} data-state={sidebarCollapsed && !isMobile ? "collapsed" : "expanded"}>
      <a className="skip-link" href="#main-content">{t("Skip to content")}</a>
      {!isMobile && <Sidebar collapsed={sidebarCollapsed} pendingPath={destination} onToggle={() => setSidebarCollapsed((value) => !value)} />}
      <div className="app-shell__main">
        <ApprovalNotice />
        <PresenceRuntime />
        <UploadRuntime />
        <header className="app-topbar">
          <span className="app-topbar__title" data-overlay={covered || undefined} role={showHeading ? "heading" : undefined} aria-level={showHeading ? 1 : undefined}>
            {!covered && (motionEnabled && !reducedMotion
              ? <SwappingText text={t(pageTitle(location.pathname))} stagger={0.025} />
              : t(pageTitle(location.pathname)))}
          </span>
          <div id="page-header-actions" className="app-topbar__actions" />
          <NotificationBell />
        </header>
        <PageActionBarProvider>
          <div id="main-content" tabIndex={-1} className="app-shell__content">
            <PushTransition transitionKey={pageKey} matchPageHighlights hasPageHighlight={pageKey === "/location" || pageKey === "/users"} />
            <div className="web-route-content" inert={covered}>
              <Suspense key={pageKey} fallback={<Spinner page />}><Outlet /></Suspense>
            </div>
            {overlayPath && <div ref={overlayRef} className="ui-resource-loading ui-resource-loading--route" data-complete={exiting || undefined} aria-hidden={exiting || undefined}>
              <UiResourceProgress key={overlayPath} label={`${t("Loading page...")} ${t(pageTitle(overlayPath))}`} loaded={progress?.loaded} total={progress?.total} pageTransition complete={exiting} />
            </div>}
          </div>
        </PageActionBarProvider>
      </div>
      {isMobile && <BottomNavigation pendingPath={destination} />}
    </div>
  );
}
