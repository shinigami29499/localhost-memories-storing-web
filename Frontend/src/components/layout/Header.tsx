import { useAuthStore } from "../../store/authStore";

export function Header() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="header">
      <div className="header__user">
        {user ? <span className="header__username">{user.username}</span> : null}
      </div>
    </header>
  );
}
