import { Suspense, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Home } from "@/components/animate-ui/icons/home";
import { LibraryBig } from "@/components/animate-ui/icons/library-big";
import { MapPin } from "@/components/animate-ui/icons/map-pin";
import { Users } from "@/components/animate-ui/icons/users";
import { Ellipsis } from "@/components/animate-ui/icons/ellipsis";
import { useLocale } from "@/context/LocaleContext";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { MobilePresenceRuntime } from "./MobilePresenceRuntime";
import { UploadRuntime } from "@/features/uploads/components/UploadRuntime";
import { MobileNotificationBell } from "./MobileNotificationBell";
import { PageActionBarProvider } from "./layout/MobilePageActionBar";
import { Spinner } from "@/components/ui";
import { MobileThemeSelector } from "./theme/MobileThemeSelector";

export function AuthenticatedLayout() {
  const { t } = useLocale();
  const location = useLocation();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); }, [open]);
  useEffect(() => { if (dialog.current?.open) dialog.current.close(); }, [location.key]);
  const moreActive = ["/profile", "/uploads", "/settings"].some((path) => location.pathname.startsWith(path));
  const title = location.pathname.startsWith("/gallery") ? "Gallery" : location.pathname.startsWith("/location") ? "Locations" : location.pathname.startsWith("/users") ? "Users" : location.pathname.startsWith("/settings") ? "Settings" : location.pathname.startsWith("/profile") ? "User profile" : location.pathname.startsWith("/uploads") ? "Upload" : "Home";
  return <div className="app-shell mobile-shell">
    <a className="skip-link" href="#main-content">{t("Skip to content")}</a>
    <MobilePresenceRuntime /><UploadRuntime />
    <div className="app-shell__main">
      <header className="mobile-header"><span role={location.pathname !== "/" && !location.pathname.startsWith("/gallery/album/") ? "heading" : undefined} aria-level={location.pathname !== "/" && !location.pathname.startsWith("/gallery/album/") ? 1 : undefined}>{t(title)}</span><div id="page-header-actions" /><MobileNotificationBell /></header>
      <PageActionBarProvider><div id="main-content" tabIndex={-1} className="app-shell__content"><Suspense fallback={<Spinner page />}><Outlet /></Suspense></div></PageActionBarProvider>
    </div>
    <nav className="mobile-nav" aria-label={t("Main navigation")}>
      <NavLink to="/" end><Home size={23} aria-hidden="true" /><span>{t("Home")}</span></NavLink>
      <NavLink to="/gallery"><LibraryBig size={23} aria-hidden="true" /><span>{t("Gallery")}</span></NavLink>
      <NavLink to="/location"><MapPin size={23} aria-hidden="true" /><span>{t("Locations")}</span></NavLink>
      <NavLink to="/users"><Users size={23} aria-hidden="true" /><span>{t("Users")}</span></NavLink>
      <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-current={moreActive ? "page" : undefined} onClick={() => setOpen(true)}><Ellipsis size={23} aria-hidden="true" /><span>{t("More")}</span></button>
    </nav>
    <dialog ref={dialog} className="mobile-more" aria-label={t("More")} onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <header><h2>{t("More")}</h2><button type="button" onClick={() => dialog.current?.close()}>{t("Close")}</button></header>
      <nav aria-label={t("More")}><NavLink to="/profile">{t("User profile")}</NavLink><NavLink to="/uploads">{t("Upload")}</NavLink><NavLink to="/settings">{t("Settings")}</NavLink></nav>
      <MobileThemeSelector labels={{ legend: t("Appearance"), system: t("System"), light: t("Light"), dark: t("Dark") }} />
      <button className="mobile-more__logout" type="button" onClick={() => { dialog.current?.close(); void logout(); }}>{t("Log out")}</button>
    </dialog>
  </div>;
}
