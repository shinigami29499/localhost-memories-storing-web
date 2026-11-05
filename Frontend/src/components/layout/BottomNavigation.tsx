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
import { useLogout } from "../../features/auth/hooks/useLogout";

export function BottomNavigation() {
  const { t } = useLocale();
  const location = useLocation();
  const logout = useLogout();
  const [moreOpen, setMoreOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const library = location.pathname.startsWith("/gallery");
  const places = location.pathname.startsWith("/location");
  const users = location.pathname.startsWith("/users");
  const more = ["/profile", "/settings"].includes(location.pathname);

  useEffect(() => { setMoreOpen(false); }, [location.key]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (moreOpen && !dialog.open) dialog.showModal();
    if (!moreOpen && dialog.open) dialog.close();
  }, [moreOpen]);

  return <>
    <nav className="bottom-navigation" aria-label={t("Main navigation")}>
      <NavLink to="/" end className="bottom-navigation__item" aria-current={location.pathname === "/" ? "page" : undefined}>
        <Home size={22} aria-hidden="true" /><span>{t("Home")}</span>
      </NavLink>
      <NavLink to="/gallery" className="bottom-navigation__item" aria-current={library ? "page" : undefined}>
        <LibraryBig size={22} aria-hidden="true" /><span>{t("Gallery")}</span>
      </NavLink>
      <NavLink to="/location" className="bottom-navigation__item" aria-current={places ? "page" : undefined}>
        <MapPin size={22} aria-hidden="true" /><span>{t("Locations")}</span>
      </NavLink>
      <NavLink to="/users" className="bottom-navigation__item" aria-current={users ? "page" : undefined}>
        <Users size={22} aria-hidden="true" /><span>{t("Users")}</span>
      </NavLink>
      <button ref={moreRef} type="button" className="bottom-navigation__item" aria-expanded={moreOpen}
        aria-haspopup="dialog" aria-current={more ? "page" : undefined} onClick={() => setMoreOpen(true)}>
        <Ellipsis size={22} aria-hidden="true" /><span>{t("More")}</span>
      </button>
    </nav>
    <dialog ref={dialogRef} className="bottom-navigation__dialog" aria-label={t("More")}
      onClose={() => { setMoreOpen(false); moreRef.current?.focus(); }}>
      <div className="bottom-navigation__dialog-header">
        <strong>{t("More")}</strong>
        <button type="button" onClick={() => dialogRef.current?.close()}>{t("Close")}</button>
      </div>
      <nav aria-label={t("More")}>
        <NavLink to="/profile" onClick={() => dialogRef.current?.close()}><UserRound size={20} aria-hidden="true" />{t("User profile")}</NavLink>
        <NavLink to="/settings" onClick={() => dialogRef.current?.close()}><Settings size={20} aria-hidden="true" />{t("Settings")}</NavLink>
        <button type="button" onClick={() => { dialogRef.current?.close(); void logout(); }}>
          <LogOut size={20} aria-hidden="true" />{t("Log out")}
        </button>
      </nav>
    </dialog>
  </>;
}
