import { Home, Users, FileText, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { authService } from "../../services/authService";
import { Brand } from "./Brand";

export function Sidebar() {
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
    <aside className="sidebar">
      <div className="sidebar__brand">
        <Brand />
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
