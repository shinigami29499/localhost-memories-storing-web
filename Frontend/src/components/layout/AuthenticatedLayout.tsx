import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
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

  return (
    <div className="app-shell" data-state="expanded">
      <a className="skip-link" href="#main-content">{t("Skip to content")}</a>
      {!isMobile && <Sidebar />}
      <div className="app-shell__main">
        <PresenceRuntime />
        <UploadRuntime />
        <header className="app-topbar">
          {location.pathname === "/" || location.pathname.startsWith("/gallery/album/")
            ? <strong className="app-topbar__title">{t(pageTitle(location.pathname))}</strong>
            : <h1 className="app-topbar__title">{t(pageTitle(location.pathname))}</h1>}
          <NotificationBell />
        </header>
        <PageActionBarProvider>
          <div id="main-content" tabIndex={-1} className="app-shell__content">
            <Suspense fallback={<Spinner />}><Outlet /></Suspense>
          </div>
        </PageActionBarProvider>
      </div>
      {isMobile && <BottomNavigation />}
    </div>
  );
}
