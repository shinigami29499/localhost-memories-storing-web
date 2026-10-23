import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { authService } from "../../services/authService";
import { Brand } from "./Brand";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

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
      <nav className="header__nav" aria-label="Main navigation">
        <a href="#feed" aria-current="page">Community feed</a>
        <a href="#create-post">Share a moment <span aria-hidden="true">&rarr;</span></a>
      </nav>
      <div className="header__user">
        {user ? (
          <>
            <span className="header__username">{user.username}</span>
            <button className="btn btn--ghost" onClick={logout}>
              Log out
            </button>
          </>
        ) : null}
      </div>
    </header>
  );
}
