import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Provider } from "@animate-ui/react/primitives/sidebar";
import { Sidebar } from "./Sidebar";

export function AuthenticatedLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.matchMedia("(max-width: 900px)").matches,
  );

  return (
    <Provider
      open={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
      className={`app-shell${sidebarCollapsed ? " app-shell--sidebar-collapsed" : ""}`}
      data-state={sidebarCollapsed ? "collapsed" : "expanded"}
      data-collapsible={sidebarCollapsed ? "icon" : ""}
    >
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <div className="app-shell__main">
        <div className="app-shell__content">
          <Outlet />
        </div>
      </div>
    </Provider>
  );
}
