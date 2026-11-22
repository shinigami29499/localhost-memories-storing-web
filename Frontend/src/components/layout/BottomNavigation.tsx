import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home } from "../animate-ui/icons/home";
import { LibraryBig } from "../animate-ui/icons/library-big";
import { MapPin } from "../animate-ui/icons/map-pin";
import { Ellipsis } from "../animate-ui/icons/ellipsis";
import { Users } from "../animate-ui/icons/users";
import { UserRound } from "../animate-ui/icons/user-round";
import { Settings } from "../animate-ui/icons/settings";
import { LogOut } from "../animate-ui/icons/log-out";
import { useLocale } from "../../context/LocaleContext";
import { Button } from "../ui/Button";
import { useLogout } from "../../features/auth/hooks/useLogout";
import { useAnimationStore } from "../../store/animationStore";

export function BottomNavigation({ pendingPath }: { pendingPath?: string } = {}) {
  const { t } = useLocale();
  const location = useLocation();
  const pathname = pendingPath ?? location.pathname;
  const logout = useLogout();
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const [moreOpen, setMoreOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const library = pathname.startsWith("/album");
  const places = pathname.startsWith("/location");
  const users = pathname.startsWith("/users");
  const more = ["/profile", "/settings"].includes(pathname);

  useEffect(() => { setMoreOpen(false); }, [location.key]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (moreOpen && !dialog.open) dialog.showModal();
    if (!moreOpen && dialog.open) dialog.close();
  }, [moreOpen]);

  return <>
    <nav className="bottom-navigation" aria-label={t("Main navigation")} data-pending={Boolean(pendingPath) || undefined}>
      <NavLink to="/" end className="bottom-navigation__item" data-highlighted={pathname === "/" || undefined}
        aria-current={location.pathname === "/" ? "page" : undefined}>
        <Home size={22} aria-hidden="true" /><span>{t("Home")}</span>
      </NavLink>
      <NavLink to="/album" className="bottom-navigation__item" data-highlighted={library || undefined}>
        <LibraryBig size={22} aria-hidden="true" /><span>{t("Album")}</span>
      </NavLink>
      <NavLink to="/location" className="bottom-navigation__item" data-highlighted={places || undefined}>
        <MapPin size={22} aria-hidden="true" /><span>{t("Locations")}</span>
      </NavLink>
      <NavLink to="/users" className="bottom-navigation__item" data-highlighted={users || undefined}>
        <Users size={22} aria-hidden="true" /><span>{t("Users")}</span>
      </NavLink>
      <button ref={moreRef} type="button" className="bottom-navigation__item" aria-expanded={moreOpen}
        aria-haspopup="dialog" data-highlighted={more || undefined}
        aria-current={["/profile", "/settings"].includes(location.pathname) ? "page" : undefined} onClick={() => setMoreOpen(true)}>
        <Ellipsis size={22} aria-hidden="true" /><span>{t("More")}</span>
      </button>
    </nav>
    <dialog ref={dialogRef} className="bottom-navigation__dialog" data-animation-enabled={animationsEnabled} aria-label={t("More")}
      onClose={() => { setMoreOpen(false); moreRef.current?.focus(); }}>
      <div className="bottom-navigation__dialog-header">
        <strong>{t("More")}</strong>
        <Button type="button" className="dialog-action dialog-action--normal" onClick={() => dialogRef.current?.close()}>{t("Close")}</Button>
      </div>
      <nav aria-label={t("More")}>
        <NavLink to="/profile" onClick={() => dialogRef.current?.close()}><UserRound size={20} aria-hidden="true" />{t("User profile")}</NavLink>
        <NavLink to="/settings" onClick={() => dialogRef.current?.close()}><Settings size={20} aria-hidden="true" />{t("Settings")}</NavLink>
        <Button type="button" variant="danger" className="dialog-action dialog-action--danger" onClick={() => { dialogRef.current?.close(); void logout(); }}>
          <LogOut size={20} aria-hidden="true" />{t("Log out")}
        </Button>
      </nav>
    </dialog>
  </>;
}
