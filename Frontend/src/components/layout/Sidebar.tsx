import { Home, Users, FileText, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
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
  const isAdmin = user?.role?.toLowerCase() === "admin";

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
          <>
            <NavLink to="/admin/users" className={({ isActive }) => `sidebar__link${isActive ? " sidebar__link--active" : ""}`}>
              <Users size={18} aria-hidden="true" />
              <span>Manage users</span>
            </NavLink>
            <NavLink to="/admin/posts" className={({ isActive }) => `sidebar__link${isActive ? " sidebar__link--active" : ""}`}>
              <FileText size={18} aria-hidden="true" />
              <span>Manage posts</span>
            </NavLink>
          </>
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
