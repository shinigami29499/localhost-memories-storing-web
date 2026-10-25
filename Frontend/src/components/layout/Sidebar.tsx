import { useState } from "react";
import { Home } from "lucide-react";
import { Users } from "@/components/animate-ui/icons/users";
import { FileText } from "@/components/animate-ui/icons/file-text";
import { LogOut } from "@/components/animate-ui/icons/log-out";
import { PanelLeftClose } from "@/components/animate-ui/icons/panel-left-close";
import { PanelLeftOpen } from "@/components/animate-ui/icons/panel-left-open";
import { ShieldCheck } from "@/components/animate-ui/icons/shield-check";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { authService } from "../../features/auth";
import { Brand } from "./Brand";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const isAdminRoute = location.pathname.startsWith("/admin");
  const [adminOpen, setAdminOpen] = useState(isAdminRoute);

  const logout = async () => {
    const { accessToken, refreshToken, clear } = useAuthStore.getState();
    try {
      if (accessToken && refreshToken) {
        await authService.logout(refreshToken, { Authorization: `Bearer ${accessToken}` });
      }
    } catch {
      // logout is best-effort
    } finally {
      clear();
      navigate("/login", { replace: true });
    }
  };

  return (
    <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
      <div className="sidebar__brand">
        <Brand />
        <button
          type="button"
          className="sidebar__toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
        </button>
      </div>
      <nav className="sidebar__nav" aria-label="Main navigation">
        <NavLink to="/" className={({ isActive }) => `sidebar__link${isActive ? " sidebar__link--active" : ""}`} end>
          <Home size={18} aria-hidden="true" />
          <span>Feed</span>
        </NavLink>
        {isAdmin ? (
          <div className={`sidebar__group${isAdminRoute ? " sidebar__group--active" : ""}`}>
            <button
              type="button"
              className={`sidebar__link sidebar__group-toggle${isAdminRoute && collapsed ? " sidebar__link--active" : ""}`}
              onClick={() => setAdminOpen((o) => !o)}
              aria-expanded={adminOpen}
              title="Admin"
            >
              <ShieldCheck size={18} aria-hidden="true" />
              <span>Admin</span>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={`sidebar__chevron${adminOpen ? " sidebar__chevron--open" : ""}`}
              />
            </button>
            {adminOpen && !collapsed ? (
              <div className="sidebar__sub-nav" role="group" aria-label="Admin pages">
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) => `sidebar__link sidebar__sub-link${isActive ? " sidebar__link--active" : ""}`}
                >
                  <Users size={16} aria-hidden="true" />
                  <span>Manage users</span>
                </NavLink>
                <NavLink
                  to="/admin/posts"
                  className={({ isActive }) => `sidebar__link sidebar__sub-link${isActive ? " sidebar__link--active" : ""}`}
                >
                  <FileText size={16} aria-hidden="true" />
                  <span>Manage posts</span>
                </NavLink>
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>
      <div className="sidebar__footer">
        {user ? (
          <button type="button" className="sidebar__link sidebar__link--danger" onClick={logout}>
            <LogOut size={18} aria-hidden="true" />
            <span>Log out</span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}
