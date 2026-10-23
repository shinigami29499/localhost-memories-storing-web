import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { authService } from "../../services/authService";
import { Brand } from "./Brand";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const logout = async () => {
    const { accessToken, refreshToken, clear } = useAuthStore.getState();
    try {
      if (accessToken && refreshToken) {
        await authService.logout(refreshToken, { Authorization: `Bearer ${accessToken}` });
      }
    } catch {
      // logout is best-effort; a locally cleared session still signs the user out
    } finally {
      clear();
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="header">
      <Brand />
      <div className="header__user">
        {user ? (
          <div
            className={`header__menu-wrap${menuOpen ? " is-open" : ""}`}
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              type="button"
              className="header__username"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {user.username}
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            <div className="header__menu" role="menu">
              {isAdmin ? (
                <>
                  <Link className="header__menu-item" role="menuitem" to="/admin/users" onClick={() => setMenuOpen(false)}>
                    Manage users
                  </Link>
                  <Link className="header__menu-item" role="menuitem" to="/admin/posts" onClick={() => setMenuOpen(false)}>
                    Manage posts
                  </Link>
                </>
              ) : null}
              <div className="header__menu-separator" role="separator" />
              <button type="button" className="header__menu-item header__menu-item--danger" role="menuitem" onClick={logout}>
                Log out
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
