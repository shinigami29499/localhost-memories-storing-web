import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigation } from "react-router-dom";
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
import { isAlbumDetailHandoff, isMobileAlbumDetail, MobilePageLink, mobileSection, useMobileBack, useOpenMobilePage } from "./layout/mobilePageNavigation";
import { isReturningToMainPage } from "@/features/ui-resources/uiOverlayPolicy";
import { MobilePageLoadingOverlay } from "./layout/MobilePageLoadingOverlay";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button, IconButton } from "@/components/ui";
import { ApprovalNotice } from "@/features/users/components/ApprovalNotice";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useAuthStore } from "@/store/authStore";
import { useAnimationStore } from "@/store/animationStore";
import { MobileNotificationBell } from "./MobileNotificationBell";

const mobileMenuItems = [
  { id: "home", label: "Home", to: "/", Icon: Home },
  { id: "album", label: "Album", to: "/album", Icon: LibraryBig },
  { id: "place", label: "Place", to: "/location", Icon: MapPin },
  { id: "user", label: "User", to: "/user", Icon: Users },
] as const;

const pageIcons = { Album: LibraryBig, Place: MapPin, User: Users, Home, Settings, Upload, "User profile": UserRound };

type MobileMenuItem = (typeof mobileMenuItems)[number];
type MenuPreview = { id: MobileMenuItem["id"]; offset?: number };
type MenuDrag = { pointerId: number; startX: number; startOffset: number; endOffset: number };

function menuItemForPath(pathname: string) {
  const section = mobileSection(pathname);
  return pathname === "/" ? "home" : section === "gallery" ? "album"
    : section === "location" ? "place" : section === "users" ? "user" : undefined;
}

function titleForPath(pathname: string) {
  const section = mobileSection(pathname);
  return section === "gallery" ? "Album" : section === "location" ? "Place"
    : section === "users" ? "User" : pathname.startsWith("/settings") ? "Settings"
      : pathname.startsWith("/profile") ? "User profile" : pathname.startsWith("/uploads") ? "Upload" : "Home";
}

function menuItemAtPointer(event: PointerEvent<HTMLElement>) {
  const link = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-menu-item]");
  if (!link || !event.currentTarget.contains(link)) return;
  return mobileMenuItems.find(({ id }) => id === link.getAttribute("data-menu-item"));
}

export function AuthenticatedLayout() {
  const { t } = useLocale();
  const location = useLocation();
  const navigation = useNavigation();
  const pendingPath = navigation.location?.pathname;
  const loading = Boolean(pendingPath && pendingPath !== location.pathname &&
    !isAlbumDetailHandoff(location.pathname, pendingPath) && !isReturningToMainPage(location.pathname, pendingPath));
  const isHome = location.pathname === "/";
  const user = useAuthStore((state) => state.user);
  const role = user?.role.toLowerCase() ?? "";
  const roleLabel = role === "superadmin" ? "Super admin" : role.charAt(0).toUpperCase() + role.slice(1);
  const section = mobileSection(location.pathname);
  const openPage = useOpenMobilePage();
  const goBack = useMobileBack();
  const logout = useLogout();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const motionEnabled = useAnimationStore((state) => state.enabled) && !reducedMotion;
  const animateMenu = useAnimationStore((state) => state.iconsEnabled) && motionEnabled;
  const [overlayPath, setOverlayPath] = useState<string>();
  const headerTitle = useRef<HTMLSpanElement>(null);
  const finishHandoff = useCallback(() => setOverlayPath(undefined), []);
  useLayoutEffect(() => {
    if (pendingPath) setOverlayPath(loading ? pendingPath : undefined);
    else if (!motionEnabled || overlayPath !== location.pathname) setOverlayPath(undefined);
  }, [loading, location.pathname, motionEnabled, overlayPath, pendingPath]);
  const handoff = !pendingPath && motionEnabled && overlayPath === location.pathname;
  const visibleOverlay = loading ? pendingPath : handoff ? overlayPath : undefined;
  const [open, setOpen] = useState(false);
  const [menuPreview, setMenuPreview] = useState<MenuPreview>();
  const menuDrag = useRef<MenuDrag | null>(null);
  const menuIndicator = useRef<HTMLSpanElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); }, [open]);
  useEffect(() => { if (dialog.current?.open) dialog.current.close(); }, [location.key]);
  useLayoutEffect(() => {
    menuDrag.current = null;
    setMenuPreview(undefined);
  }, [location.key]);
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
  const activeMenuItem = menuItemForPath(location.pathname);
  const highlightedMenuItem = pendingPath ? menuItemForPath(pendingPath) : menuPreview?.id ?? activeMenuItem;
  const dragOffset = menuPreview?.offset;

  const startMenuDrag = (event: PointerEvent<HTMLAnchorElement>) => {
    if (!event.isPrimary || event.button !== 0
      || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const indicator = menuIndicator.current;
    if (!indicator) return;
    const { direction, transform } = getComputedStyle(indicator);
    const endOffset = indicator.getBoundingClientRect().width * (mobileMenuItems.length - 1)
      * (direction === "rtl" ? -1 : 1);
    if (!endOffset) return;
    menuDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startOffset: new DOMMatrixReadOnly(transform === "none" ? undefined : transform).m41,
      endOffset,
    };
  };

  const clearMenuDrag = (event: PointerEvent<HTMLElement>) => {
    if (menuDrag.current?.pointerId !== event.pointerId) return;
    menuDrag.current = null;
    setMenuPreview(activeMenuItem ? { id: activeMenuItem } : undefined);
  };

  const moveMenuDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = menuDrag.current;
    if (drag?.pointerId !== event.pointerId) return;
    const nav = event.currentTarget;
    if (!nav.hasPointerCapture(event.pointerId)) {
      if (Math.abs(event.clientX - drag.startX) < 6) return;
      nav.setPointerCapture(event.pointerId);
    }
    const offset = Math.min(Math.max(0, drag.endOffset),
      Math.max(Math.min(0, drag.endOffset), drag.startOffset + event.clientX - drag.startX));
    const index = Math.round((offset / drag.endOffset) * (mobileMenuItems.length - 1));
    setMenuPreview({ id: mobileMenuItems[index].id, offset });
  };

  const endMenuDrag = (event: PointerEvent<HTMLElement>) => {
    if (menuDrag.current?.pointerId !== event.pointerId) return;
    const destination = event.currentTarget.hasPointerCapture(event.pointerId) ? menuItemAtPointer(event) : undefined;
    if (!destination || destination.id === activeMenuItem) {
      clearMenuDrag(event);
      return;
    }
    menuDrag.current = null;
    setMenuPreview({ id: destination.id });
    openPage(destination.to);
  };

  const title = titleForPath(location.pathname);
  const pendingTitle = visibleOverlay ? titleForPath(visibleOverlay) : title;
  const PendingIcon = pageIcons[pendingTitle];
  const albumDetail = isMobileAlbumDetail(location.pathname);
  const albumList = section === "gallery" && !albumDetail;
  const hasBack = albumDetail || (!isHome && !section);
  return <div className="app-shell mobile-shell">
    <a className="skip-link" href="#main-content" inert={loading || undefined}>{t("Skip to content")}</a>
    <MobilePresenceRuntime /><UploadRuntime />
    <div className="app-shell__main">
      <ApprovalNotice />
      <header className="mobile-header mobile-shell-header" data-home={isHome} data-back={hasBack} data-gallery={section === "gallery"}
        data-overlay={Boolean(visibleOverlay) || undefined}>
        <div className="mobile-shell-header__identity" inert={Boolean(visibleOverlay)}>
          {user && <MobilePageLink to="/profile" className="mobile-home-header__identity" inert={!isHome}>
            <UserAvatar user={user} className="mobile-home-header__avatar" />
            <span className="mobile-home-header__account">
              <span className="mobile-home-header__username">{user.username}</span>
              {roleLabel && <span className="mobile-home-header__role">{t(roleLabel)}</span>}
            </span>
          </MobilePageLink>}
          {!albumList && <IconButton className="mobile-flat-icon-button mobile-header-back mobile-shell-header__back"
            aria-label={t("Back")} title={t("Back")} inert={!hasBack} onClick={goBack}>
            <ArrowLeft />
          </IconButton>}
          <div key="page-title" className="mobile-shell-header__title-position">
            {!isHome && <span role={albumDetail ? undefined : "heading"} aria-level={albumDetail ? undefined : 1}
              className={section === "users" ? "mobile-header__title mobile-users__title" : "mobile-header__title"}>
              <span ref={headerTitle} className="mobile-page-title">{t(title)}</span>
            </span>}
          </div>
        </div>
        <div id="page-header-actions" inert={Boolean(visibleOverlay)} />
        <div className="mobile-shell-header__actions">
          <MobileNotificationBell />
          <IconButton ref={trigger} className="mobile-flat-icon-button" aria-label={t("More")} title={t("More")}
            aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu animate={animateMenu && open} aria-hidden="true" />
          </IconButton>
        </div>
      </header>
      <div className="mobile-page-body">
        <div className="mobile-page-route" inert={loading}>
          <PageActionBarProvider><div id="main-content" tabIndex={-1} className="app-shell__content">
            <Outlet />
          </div></PageActionBarProvider>
        </div>
        {visibleOverlay && <MobilePageLoadingOverlay key={visibleOverlay} pathname={visibleOverlay} title={pendingTitle}
          icon={<PendingIcon size={36} />} handoff={handoff} headerTitle={headerTitle} onHandoffComplete={finishHandoff} />}
      </div>
    </div>
    <div className="mobile-bottom-slot">
    <nav className="mobile-menu-bar" aria-label={t("Main navigation")} data-item={highlightedMenuItem}
      data-dragging={dragOffset !== undefined || undefined}
      onPointerMove={moveMenuDrag} onPointerUp={endMenuDrag} onPointerCancel={clearMenuDrag}
      onPointerLeave={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) clearMenuDrag(event);
      }}
      onLostPointerCapture={(event) => {
        if (event.target === event.currentTarget) clearMenuDrag(event);
      }}>
      <span ref={menuIndicator} className="mobile-menu-bar__indicator" aria-hidden="true"
        style={dragOffset === undefined ? undefined : { transform: `translateX(${dragOffset}px)` }} />
      {mobileMenuItems.map(({ id, label, to, Icon }) => (
        <MobilePageLink key={id} to={to} data-menu-item={id} data-highlighted={id === highlightedMenuItem || undefined}
          aria-current={id === activeMenuItem ? "page" : undefined} draggable={id === activeMenuItem ? false : undefined}
          onPointerDown={id === activeMenuItem ? startMenuDrag : undefined}>
          <Icon size={20} aria-hidden="true" /><span>{t(label)}</span>
        </MobilePageLink>
      ))}
    </nav>
    </div>
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
        <NavLink to="/profile" onClick={(event) => openPage("/profile", event, { beforeNavigate: () => dialog.current?.close() })}>{t("User profile")}</NavLink>
        <NavLink to="/uploads" onClick={(event) => openPage("/uploads", event, { beforeNavigate: () => dialog.current?.close() })}>{t("Upload")}</NavLink>
        <NavLink to="/settings" onClick={(event) => openPage("/settings", event, { beforeNavigate: () => dialog.current?.close() })}>{t("Settings")}</NavLink>
      </nav>
      <Button variant="danger" className="mobile-more__logout" type="button" onClick={() => { dialog.current?.close(); void logout(); }}>
        <X size={20} aria-hidden="true" />
        {t("Log out")}
      </Button>
    </dialog>
  </div>;
}
