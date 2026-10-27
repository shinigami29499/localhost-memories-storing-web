import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Provider } from "@animate-ui/react/primitives/sidebar";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Brand } from "./Brand";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";
import { UploadRuntime } from "../../features/uploads/components/UploadRuntime";

export const MOBILE_QUERY = "(max-width: 640px)";

export function AuthenticatedLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.matchMedia("(max-width: 900px)").matches,
  );
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const location = useLocation();
  const drawerOpen = isMobile && !sidebarCollapsed;

  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true);
  }, [isMobile, location.key]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarCollapsed(true);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen]);

  return (
    <Provider
      open={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
      className={`app-shell${sidebarCollapsed ? " app-shell--sidebar-collapsed" : ""}`}
      data-state={sidebarCollapsed ? "collapsed" : "expanded"}
      data-collapsible={sidebarCollapsed ? "icon" : ""}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        isMobile={isMobile}
      />
      {drawerOpen ? (
        <div className="sidebar-backdrop" aria-hidden="true" onClick={() => setSidebarCollapsed(true)} />
      ) : null}
      <div className="app-shell__main">
        <UploadRuntime />
        <header className="app-topbar">
          {isMobile ? <Brand /> : null}
          <NotificationBell />
        </header>
        <div className="app-shell__content">
          <Outlet />
        </div>
      </div>
    </Provider>
  );
}
