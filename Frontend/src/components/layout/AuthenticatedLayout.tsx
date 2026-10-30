import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Provider } from "@animate-ui/react/primitives/sidebar";
import { ScrollProgressContainer, ScrollProgressProvider } from "@animate-ui/react/primitives/scroll-progress";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";
import { UploadRuntime } from "../../features/uploads/components/UploadRuntime";
import { Spinner } from "../ui/Status";
import { useLocale } from "../../context/LocaleContext";
import { PageTransition } from "./PageTransition";
import { readPageTransitionEffect } from "../../utils/pageTransition";

export const MOBILE_QUERY = "(max-width: 640px)";

export function AuthenticatedLayout() {
  const { t } = useLocale();
  const mainRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.matchMedia("(max-width: 900px)").matches,
  );
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const location = useLocation();
  const pageTransition = readPageTransitionEffect();
  const drawerOpen = isMobile && !sidebarCollapsed;

  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true);
  }, [isMobile, location.key]);

  useEffect(() => {
    if (!drawerOpen) return;
    const shell = mainRef.current?.parentElement;
    const sidebar = shell?.querySelector<HTMLElement>(".sidebar");
    const toggle = shell?.querySelector<HTMLButtonElement>(".sidebar__toggle");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar?.querySelector<HTMLElement>("a[href]")?.focus();
    const handleDrawerKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarCollapsed(true);
      } else if (event.key === "Tab") {
        const controls = Array.from(sidebar?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), [tabindex="0"]',
        ) ?? []).filter((element) =>
          element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden",
        );
        if (toggle) controls.push(toggle);
        const first = controls[0];
        const last = controls[controls.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !controls.some((element) => element === active))) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && (active === last || !controls.some((element) => element === active))) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleDrawerKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDrawerKey);
      if (toggle?.isConnected) toggle.focus();
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
      <a className="skip-link" href="#main-content" hidden={drawerOpen}>{t("Skip to content")}</a>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        isMobile={isMobile}
      />
      {drawerOpen ? (
        <div className="sidebar-backdrop" aria-hidden="true" onClick={() => setSidebarCollapsed(true)} />
      ) : null}
      <div ref={mainRef} className="app-shell__main" inert={drawerOpen}>
        <UploadRuntime />
        <header className="app-topbar">
          <NotificationBell />
        </header>
        <ScrollProgressProvider>
          <ScrollProgressContainer id="main-content" tabIndex={-1} className="app-shell__content">
            <PageTransition effect={pageTransition}>
              <Suspense fallback={<Spinner label="Loading page…" />}>
                <Outlet />
              </Suspense>
            </PageTransition>
          </ScrollProgressContainer>
        </ScrollProgressProvider>
      </div>
    </Provider>
  );
}
