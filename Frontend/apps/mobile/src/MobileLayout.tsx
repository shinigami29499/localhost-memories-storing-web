import { Suspense, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LibraryBig } from "@/components/animate-ui/icons/library-big";
import { MapPin } from "@/components/animate-ui/icons/map-pin";
import { Users } from "@/components/animate-ui/icons/users";
import { ArrowLeft, X } from "lucide-react";
import { Home } from "@/components/animate-ui/icons/home";
import { Menu } from "@/components/animate-ui/icons/menu";
import { Settings } from "@/components/animate-ui/icons/settings";
import { Upload } from "@/components/animate-ui/icons/upload";
import { UserRound } from "@/components/animate-ui/icons/user-round";
import { useLocale } from "@/context/LocaleContext";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { MobilePresenceRuntime } from "./MobilePresenceRuntime";
import { UploadRuntime } from "@/features/uploads/components/UploadRuntime";
import { PageActionBarProvider } from "./layout/MobilePageActionBar";
import { getMobilePageTransition, isMobileAlbumDetail, MobilePageLink, mobileSection, useMobileBack, useOpenMobilePage } from "./layout/mobilePageNavigation";
import { MobilePageLoadingOverlay } from "./layout/MobilePageLoadingOverlay";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button, IconButton, Spinner } from "@/components/ui";
import { ApprovalNotice } from "@/features/users/components/ApprovalNotice";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useAuthStore } from "@/store/authStore";
import { useAnimationStore } from "@/store/animationStore";
import { MobileNotificationBell } from "./MobileNotificationBell";

const pageIcons = {
  Gallery: LibraryBig,
  Locations: MapPin,
  User: Users,
  Settings,
  "User profile": UserRound,
  Upload,
  Home,
};

const mobileTabs = [
  { id: "home", label: "Home", to: "/", Icon: Home },
  { id: "gallery", label: "Gallery", to: "/gallery", Icon: LibraryBig },
  { id: "location", label: "Locations", to: "/location", Icon: MapPin },
  { id: "users", label: "Users", to: "/users", Icon: Users },
] as const;

export function AuthenticatedLayout() {
  const { t } = useLocale();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const user = useAuthStore((state) => state.user);
  const role = user?.role.toLowerCase() ?? "";
  const roleLabel = role === "superadmin" ? "Super admin" : role.charAt(0).toUpperCase() + role.slice(1);
  const section = mobileSection(location.pathname);
  const openPage = useOpenMobilePage();
  const goBack = useMobileBack();
  const logout = useLogout();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animateMenu = useAnimationStore((state) => state.enabled && state.iconsEnabled) && !reducedMotion;
  const [completedTransition, setCompletedTransition] = useState<number>();
  const transition = getMobilePageTransition(location.key);
  const loading = transition && transition.id !== completedTransition && !reducedMotion;
  const [open, setOpen] = useState(false);
  const page = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!transition || !reducedMotion) return;
    transition.stopTracking();
    setCompletedTransition(transition.id);
  }, [transition, reducedMotion]);
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); }, [open]);
  useEffect(() => { if (dialog.current?.open) dialog.current.close(); }, [location.key]);
  useEffect(() => {
    const viewport = window.visualViewport;
    let baseline = viewport?.height ?? window.innerHeight;
    const update = () => {
      const active = document.activeElement;
      const editing = active instanceof HTMLElement && active.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
      const height = viewport?.height ?? window.innerHeight;
      if (!editing) baseline = height;
      document.documentElement.classList.toggle("mobile-keyboard-open", editing && baseline - height > 150);
    };
    const onFocus = () => window.setTimeout(update, 100);
    window.addEventListener("resize", update);
    viewport?.addEventListener("resize", update);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocus);
    return () => {
      window.removeEventListener("resize", update);
      viewport?.removeEventListener("resize", update);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onFocus);
      document.documentElement.classList.remove("mobile-keyboard-open");
    };
  }, []);
  const currentTab = isHome ? "home" : section;
  const title = section === "gallery" ? "Gallery" : section === "location" ? "Locations" : section === "users" ? "User" : location.pathname.startsWith("/settings") ? "Settings" : location.pathname.startsWith("/profile") ? "User profile" : location.pathname.startsWith("/uploads") ? "Upload" : "Home";
  const PageIcon = pageIcons[title];
  const albumDetail = isMobileAlbumDetail(location.pathname);
  const hasBack = albumDetail || (!isHome && !section);
  const Title = albumDetail ? "span" : "h1";
  return <div className="app-shell mobile-shell">
    <a className="skip-link" href="#main-content" inert={loading || undefined}>{t("Skip to content")}</a>
    <MobilePresenceRuntime /><UploadRuntime />
    <div ref={page} className="app-shell__main">
      <div inert={loading || undefined}><ApprovalNotice /></div>
      <header className="mobile-header mobile-shell-header" data-home={isHome} data-back={hasBack} data-gallery={section === "gallery"}>
        <div className="mobile-shell-header__identity">
          {user && <MobilePageLink to="/profile" className="mobile-home-header__identity" inert={!isHome}>
            <UserAvatar user={user} className="mobile-home-header__avatar" />
            <span className="mobile-home-header__account">
              <span className="mobile-home-header__username">{user.username}</span>
              {roleLabel && <span className="mobile-home-header__role">{t(roleLabel)}</span>}
            </span>
          </MobilePageLink>}
          <IconButton className="mobile-flat-icon-button mobile-header-back mobile-shell-header__back"
            aria-label={t("Back")} title={t("Back")} inert={!hasBack} onClick={goBack}>
            <ArrowLeft />
          </IconButton>
          <div className="mobile-shell-header__title-position">
            {!isHome && <Title className={section === "users" ? "mobile-header__title mobile-users__title" : "mobile-header__title"}>
              <span className="mobile-page-title">{t(title)}</span>
            </Title>}
          </div>
        </div>
        <div id="page-header-actions" inert={loading || undefined} />
        <div className="mobile-shell-header__actions">
          <MobileNotificationBell />
          <IconButton ref={trigger} className="mobile-flat-icon-button" aria-label={t("More")} title={t("More")}
            aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu animate={animateMenu && open} aria-hidden="true" />
          </IconButton>
        </div>
      </header>
      <div className="mobile-page-body" inert={loading || undefined}>
        <PageActionBarProvider><div id="main-content" tabIndex={-1} className="app-shell__content">
          <Suspense fallback={<div className="mobile-page-suspense" data-mobile-page-pending><Spinner page /></div>}><Outlet /></Suspense>
        </div></PageActionBarProvider>
      </div>
    </div>
    <nav className="mobile-nav" aria-label={t("Main navigation")} data-tab={currentTab ?? undefined}>
      <span className="mobile-nav__indicator" aria-hidden="true" />
      {mobileTabs.map(({ id, label, to, Icon }) => (
        <MobilePageLink key={id} to={to} aria-current={id === currentTab ? "page" : undefined}>
          <Icon size={26} aria-hidden="true" /><span>{t(label)}</span>
        </MobilePageLink>
      ))}
    </nav>
    <dialog ref={dialog} className="mobile-more" aria-label={t("More")} closedby="any"
      onClick={(event) => {
        const sheet = event.currentTarget;
        // Older browsers retarget backdrop clicks to the dialog without dismissing it.
        if ("closedBy" in HTMLDialogElement.prototype || event.target !== sheet) return;
        const { left, right, top, bottom } = sheet.getBoundingClientRect();
        if (event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom) sheet.close();
      }}
      onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <nav aria-label={t("More")}>
        <NavLink to="/profile" onClick={(event) => openPage("/profile", event, () => dialog.current?.close())}>{t("User profile")}</NavLink>
        <NavLink to="/uploads" onClick={(event) => openPage("/uploads", event, () => dialog.current?.close())}>{t("Upload")}</NavLink>
        <NavLink to="/settings" onClick={(event) => openPage("/settings", event, () => dialog.current?.close())}>{t("Settings")}</NavLink>
      </nav>
      <Button variant="danger" className="mobile-more__logout" type="button" onClick={() => { dialog.current?.close(); void logout(); }}>
        <X size={20} aria-hidden="true" />
        {t("Log out")}
      </Button>
    </dialog>
    {loading && <MobilePageLoadingOverlay key={transition.id} transition={transition} title={t(title)}
      icon={<PageIcon size={36} />} pageRef={page} onComplete={setCompletedTransition} />}
  </div>;
}
