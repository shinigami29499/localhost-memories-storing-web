import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigation } from "react-router-dom";
import { Camera } from "@/components/animate-ui/icons/camera";
import { Compass } from "@/components/animate-ui/icons/compass";
import { Activity, ArrowLeft, X } from "lucide-react";
import { motion } from "motion/react";
import { IconWrapper, useAnimateIconContext, type IconProps } from "@/components/animate-ui/icons/icon";
import { Menu } from "@/components/animate-ui/icons/menu";
import { Settings } from "@/components/animate-ui/icons/settings";
import { Upload } from "@/components/animate-ui/icons/upload";
import { UserRound } from "@/components/animate-ui/icons/user-round";
import { useLocale } from "@/context/LocaleContext";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { MobilePresenceRuntime } from "./MobilePresenceRuntime";
import { UploadRuntime } from "@/features/uploads/components/UploadRuntime";
import { PageActionBarProvider } from "./layout/MobilePageActionBar";
import { isMobileAlbumDetail, MobilePageLink, mobileSection, useMobileBack, useOpenMobilePage } from "./layout/mobilePageNavigation";
import { MobilePageLoadingOverlay } from "./layout/MobilePageLoadingOverlay";
import { MobileMenuActionButton, MobileMenuActionContext } from "./layout/MobileMenuAction";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useRouteLoadingOverlay } from "@/features/ui-resources/useRouteLoadingOverlay";
import { Button, IconButton } from "@/components/ui";
import { ApprovalNotice } from "@/features/users/components/ApprovalNotice";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useAuthStore } from "@/store/authStore";
import { useAnimationStore } from "@/store/animationStore";
import { MobileNotificationBell } from "./MobileNotificationBell";

const MotionActivity = motion.create(Activity);
const activityPulse = {
  initial: { scaleY: 1 },
  animate: { scaleY: [1, 0.72, 1.08, 1], transition: { duration: 0.44 } },
};

function ActivityPulse({ size, ...props }: IconProps<"default">) {
  const { controls } = useAnimateIconContext();
  return <MotionActivity size={size} variants={activityPulse} initial="initial" animate={controls} {...props} />;
}

function MenuActivityIcon(props: IconProps<"default">) {
  return <IconWrapper icon={ActivityPulse} animateOnHover animateOnTap={false} animateOnView={false} {...props} />;
}

const mobileMenuItems = [
  { id: "home", label: "Home", to: "/", Icon: MenuActivityIcon },
  { id: "album", label: "Album", to: "/album", Icon: Camera },
  { id: "place", label: "Place", to: "/location", Icon: Compass },
  { id: "user", label: "User", to: "/user", Icon: UserRound },
] as const;

const pageIcons = { Album: Camera, Place: Compass, User: UserRound, Home: Activity, Settings, Upload, "User profile": UserRound };

type MobileMenuItem = (typeof mobileMenuItems)[number];
type MenuPreview = { id: MobileMenuItem["id"]; offset?: number };
type MenuDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  startIndex: number;
  startOffset: number;
  offsets: number[];
  direction: number;
  fromActiveItem: boolean;
};
const menuDragThreshold = 6;

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
  const { path: routeOverlay, fromPath: overlayFrom, loading, exiting } = useRouteLoadingOverlay();
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
  const headerTitle = useRef<HTMLSpanElement>(null);
  const covered = loading && Boolean(routeOverlay);
  const [open, setOpen] = useState(false);
  const [menuPreview, setMenuPreview] = useState<MenuPreview>();
  const [menuAction, setMenuAction] = useState<{ label: string; onClick: () => void } | null>(null);
  const menuActionButton = useRef<HTMLButtonElement>(null);
  const menuActionContext = useMemo(() => ({ buttonRef: menuActionButton, setAction: setMenuAction }), []);
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
    let focusTimer: number | undefined;
    const onFocus = () => {
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(update, 100);
    };
    window.addEventListener("resize", update);
    viewport?.addEventListener("resize", update);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocus);
    return () => {
      window.clearTimeout(focusTimer);
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

  const startMenuDrag = (event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary || event.button !== 0
      || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest(".mobile-menu-bar__add")) return;
    const indicator = menuIndicator.current;
    const startIndex = mobileMenuItems.findIndex(({ id }) => id === activeMenuItem);
    if (!indicator || startIndex === -1) return;
    const fromActiveItem = event.target instanceof Element &&
      Boolean(event.target.closest('[aria-current="page"]'));
    const style = getComputedStyle(indicator);
    const direction = style.direction === "rtl" ? -1 : 1;
    const tabWidth = indicator.getBoundingClientRect().width;
    const centerWidth = event.currentTarget.querySelector(".mobile-menu-bar__action")?.getBoundingClientRect().width ?? 0;
    if (!tabWidth) return;
    const offsets = mobileMenuItems.map((_, index) => index * tabWidth + (index >= 2 ? centerWidth : 0));
    menuDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startIndex,
      startOffset: fromActiveItem
        ? new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform).m41
        : offsets[startIndex] * direction,
      offsets,
      direction,
      fromActiveItem,
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
    const deltaX = event.clientX - drag.startX;
    if (!nav.hasPointerCapture(event.pointerId)) {
      const deltaY = event.clientY - drag.startY;
      if (!drag.fromActiveItem && Math.abs(deltaY) >= menuDragThreshold && Math.abs(deltaY) >= Math.abs(deltaX)) {
        clearMenuDrag(event);
        return;
      }
      if (Math.abs(deltaX) < menuDragThreshold) return;
      nav.setPointerCapture(event.pointerId);
    }
    const lastIndex = mobileMenuItems.length - 1;
    const minIndex = drag.fromActiveItem ? 0 : Math.max(0, drag.startIndex - 1);
    const maxIndex = drag.fromActiveItem ? lastIndex : Math.min(lastIndex, drag.startIndex + 1);
    const position = Math.min(drag.offsets[maxIndex],
      Math.max(drag.offsets[minIndex], (drag.startOffset + deltaX) * drag.direction));
    const index = drag.offsets.findIndex((offset, index) =>
      index === lastIndex || position < (offset + drag.offsets[index + 1]) / 2);
    setMenuPreview({ id: mobileMenuItems[index].id, offset: position * drag.direction });
  };

  const endMenuDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = menuDrag.current;
    if (drag?.pointerId !== event.pointerId) return;
    let destination: MobileMenuItem | undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      const deltaX = event.clientX - drag.startX;
      if (drag.fromActiveItem) destination = menuItemAtPointer(event);
      else if (Math.abs(deltaX) >= menuDragThreshold) {
        destination = mobileMenuItems[drag.startIndex + Math.sign(deltaX * drag.direction)];
      }
    }
    if (!destination || destination.id === activeMenuItem) {
      clearMenuDrag(event);
      return;
    }
    menuDrag.current = null;
    setMenuPreview({ id: destination.id });
    openPage(destination.to);
  };

  const title = titleForPath(location.pathname);
  const pendingTitle = routeOverlay ? titleForPath(routeOverlay) : title;
  const keepTitle = Boolean(overlayFrom && overlayFrom !== "/" && routeOverlay !== "/"
    && t(titleForPath(overlayFrom)) === t(pendingTitle));
  const handoff = exiting && !reducedMotion && !isHome && !keepTitle && routeOverlay === location.pathname;
  const PendingIcon = pageIcons[pendingTitle];
  const albumDetail = isMobileAlbumDetail(location.pathname);
  const hasBack = albumDetail || (!isHome && !section);
  return <div className="app-shell mobile-shell" data-album-detail={albumDetail || undefined}>
    <a className="skip-link" href="#main-content" inert={covered || undefined}>{t("Skip to content")}</a>
    <MobilePresenceRuntime /><UploadRuntime />
    <div className="app-shell__main">
      <ApprovalNotice />
      <header className="mobile-header mobile-shell-header" data-home={isHome} data-back={hasBack} data-gallery={section === "gallery"}
        data-overlay={(Boolean(routeOverlay) && !exiting) || undefined} data-keep-title={keepTitle || undefined}>
        <div className="mobile-shell-header__identity" inert={covered}>
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
          <div key="page-title" className="mobile-shell-header__title-position">
            {!isHome && <span role={albumDetail ? undefined : "heading"} aria-level={albumDetail ? undefined : 1}
              className={section === "users" ? "mobile-header__title mobile-users__title" : "mobile-header__title"}>
              <span ref={headerTitle} className="mobile-page-title">{t(title)}</span>
            </span>}
          </div>
        </div>
        <div id="page-header-actions" inert={covered} />
        <div className="mobile-shell-header__actions">
          <MobileNotificationBell />
          <IconButton ref={trigger} className="mobile-flat-icon-button" aria-label={t("More")} title={t("More")}
            aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu animate={animateMenu && open} aria-hidden="true" />
          </IconButton>
        </div>
      </header>
      <div className="mobile-page-body">
        <div className="mobile-page-route" inert={covered}>
          <PageActionBarProvider><div id="main-content" tabIndex={-1} className="app-shell__content">
            <MobileMenuActionContext.Provider value={menuActionContext}><Outlet /></MobileMenuActionContext.Provider>
          </div></PageActionBarProvider>
        </div>
        {routeOverlay && <MobilePageLoadingOverlay key={routeOverlay} pathname={routeOverlay} title={pendingTitle}
          keepHeaderTitle={keepTitle} icon={<PendingIcon size={36} />} pageTransition complete={exiting} handoff={handoff} headerTitle={headerTitle} />}
      </div>
    </div>
    <div className="mobile-bottom-slot" data-gallery-list={section === "gallery" && !albumDetail || undefined} inert={albumDetail || undefined}>
    <nav className="mobile-menu-bar" aria-label={t("Main navigation")} data-item={highlightedMenuItem}
      data-dragging={dragOffset !== undefined || undefined}
      onPointerDown={startMenuDrag} onPointerMove={moveMenuDrag} onPointerUp={endMenuDrag} onPointerCancel={clearMenuDrag}
      onPointerLeave={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) clearMenuDrag(event);
      }}
      onLostPointerCapture={(event) => {
        if (event.target === event.currentTarget) clearMenuDrag(event);
      }}>
      <span ref={menuIndicator} className="mobile-menu-bar__indicator" aria-hidden="true"
        style={dragOffset === undefined ? undefined : { transform: `translateX(${dragOffset}px)` }} />
      {mobileMenuItems.map(({ id, label, to, Icon }, index) => (
        <Fragment key={id}>
          {index === 2 && <div className="mobile-menu-bar__action">
            <MobileMenuActionButton ref={menuActionButton} label={menuAction?.label ?? t("Add")} onClick={menuAction?.onClick} />
          </div>}
          <MobilePageLink to={to} data-menu-item={id} data-highlighted={id === highlightedMenuItem || undefined}
            aria-current={id === activeMenuItem ? "page" : undefined} draggable={activeMenuItem ? false : undefined}>
            <Icon aria-hidden="true" /><span>{t(label)}</span>
          </MobilePageLink>
        </Fragment>
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
