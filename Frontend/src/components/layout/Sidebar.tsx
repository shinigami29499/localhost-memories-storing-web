import { useEffect, useRef, useState } from "react";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Camera } from "@/components/animate-ui/icons/camera";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { Download } from "@/components/animate-ui/icons/download";
import { RefreshCw } from "@/components/animate-ui/icons/refresh-cw";
import { Home } from "@/components/animate-ui/icons/home";
import { LibraryBig } from "@/components/animate-ui/icons/library-big";
import { LogOut } from "@/components/animate-ui/icons/log-out";
import { MapPin } from "@/components/animate-ui/icons/map-pin";
import { PanelLeftClose } from "@/components/animate-ui/icons/panel-left-close";
import { PanelLeftOpen } from "@/components/animate-ui/icons/panel-left-open";
import { PlaneTakeoff } from "@/components/animate-ui/icons/plane-takeoff";
import { Settings } from "@/components/animate-ui/icons/settings";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { Upload } from "@/components/animate-ui/icons/upload";
import { Users } from "@/components/animate-ui/icons/users";
import { Utensils } from "@/components/animate-ui/icons/utensils";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { authService } from "../../features/auth";
import { showToast } from "../ui";
import { Brand } from "./Brand";
import { Container, Gap, Highlight } from "@animate-ui/react/primitives/sidebar";
import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";
import { useLocale } from "../../context/LocaleContext";
import { UserAvatar } from "../common/UserAvatar";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

export function Sidebar({ collapsed, onToggle, isMobile = false }: SidebarProps) {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const [libraryOpen, setLibraryOpen] = useState(true);
  const [locationsOpen, setLocationsOpen] = useState(true);
  const [syncOpen, setSyncOpen] = useState(true);
  const locationsActive = location.pathname.startsWith("/location/travel")
    || location.pathname.startsWith("/location/food");
  const libraryActive = location.pathname.startsWith("/library/gallery")
    || location.pathname.startsWith("/library/album")
    || location.pathname.startsWith("/saved");
  const libraryLinks = [
    { to: "/library/gallery", label: "Gallery", icon: Camera, active: location.pathname === "/library/gallery" },
    { to: "/library/album", label: "Album", icon: Bookmark, active: location.pathname.startsWith("/library/album") || location.pathname.startsWith("/saved") },
    ...(isAdmin
      ? [{ to: "/library/gallery/trash", label: "Trash", icon: Trash2, active: location.pathname === "/library/gallery/trash" }]
      : []),
  ];
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const compact = collapsed && !isMobile;
  const SidebarInner = isMobile ? "div" : Highlight;
  const roleName = user
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
    : "";

  useEffect(() => {
    if (!accountMenuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !accountRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
        accountTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);

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
      showToast.success(t("Logout successfully"));
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      <Gap className="sidebar-gap" aria-hidden="true" />
      <Container className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`} inert={isMobile && collapsed}>
        <SidebarInner className="sidebar__inner">
          <div className="sidebar__brand">
            <Brand />
          </div>
          <nav id="sidebar-navigation" className="sidebar__nav" aria-label={t("Main navigation")}>
            <AnimateIcon animateOnTap completeOnStop asChild>
              <NavLink
                to="/"
                className={`sidebar__link sidebar__home-link${location.pathname === "/" ? " sidebar__link--active" : ""}`}
                end
                data-sidebar="menu-button"
                aria-label={t("Home")}
                title={t("Home")}
              >
                <Home size={18} className="sidebar__home-icon" aria-hidden="true" />
                <span>{t("Home")}</span>
              </NavLink>
            </AnimateIcon>
            <Collapsible.Root
              className={`sidebar__group${libraryActive ? " sidebar__group--active" : ""}`}
              open={libraryOpen && !compact}
              onOpenChange={(open) => setLibraryOpen(compact || open)}
            >
              <AnimateIcon animateOnTap completeOnStop asChild>
                <Collapsible.Trigger
                  type="button"
                  className={`sidebar__link sidebar__group-toggle${libraryActive && compact ? " sidebar__link--active" : ""}`}
                  onClick={() => { if (compact) onToggle(); }}
                  aria-label={t("Library")}
                  title={t("Library")}
                  data-sidebar="menu-button"
                >
                  <LibraryBig size={18} aria-hidden="true" />
                  <span>{t("Library")}</span>
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`sidebar__chevron${libraryOpen ? " sidebar__chevron--open" : ""}`}
                  />
                </Collapsible.Trigger>
              </AnimateIcon>
              <Collapsible.Panel className="sidebar__sub-panel" role="group" aria-label={t("Library items")}>
                <div className="sidebar__sub-nav">
                  {libraryLinks.map(({ to, label, icon: Icon, active }) => (
                    <AnimateIcon key={to} animateOnTap completeOnStop asChild>
                      <NavLink
                        to={to}
                        end={to !== "/library/album"}
                        className={`sidebar__link sidebar__sub-link${active ? " sidebar__link--active" : ""}`}
                        data-sidebar="menu-sub-button"
                        aria-label={t(label)}
                        title={t(label)}
                      >
                        <Icon size={16} aria-hidden="true" />
                        <span>{t(label)}</span>
                      </NavLink>
                    </AnimateIcon>
                  ))}
                </div>
              </Collapsible.Panel>
            </Collapsible.Root>
            <Collapsible.Root
              className={`sidebar__group${locationsActive ? " sidebar__group--active" : ""}`}
              open={locationsOpen && !compact}
              onOpenChange={(open) => setLocationsOpen(open)}
            >
              <AnimateIcon animateOnTap completeOnStop asChild>
                <Collapsible.Trigger
                  type="button"
                  className={`sidebar__link sidebar__group-toggle${locationsActive && compact ? " sidebar__link--active" : ""}`}
                  onClick={() => { if (compact) onToggle(); }}
                  aria-label={t("Locations")}
                  title={t("Locations")}
                  data-sidebar="menu-button"
                >
                  <MapPin size={18} aria-hidden="true" />
                  <span>{t("Locations")}</span>
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`sidebar__chevron${locationsOpen ? " sidebar__chevron--open" : ""}`}
                  />
                </Collapsible.Trigger>
              </AnimateIcon>
              <Collapsible.Panel className="sidebar__sub-panel" role="group" aria-label={t("Locations")}>
                <div className="sidebar__sub-nav">
                  <AnimateIcon animateOnTap completeOnStop asChild>
                    <NavLink
                      to="/location/travel"
                      className={`sidebar__link sidebar__sub-link${location.pathname === "/location/travel" ? " sidebar__link--active" : ""}`}
                      data-sidebar="menu-sub-button"
                      aria-label={t("Travel")}
                      title={t("Travel")}
                    >
                      <PlaneTakeoff size={16} aria-hidden="true" />
                      <span>{t("Travel")}</span>
                    </NavLink>
                  </AnimateIcon>
                  <AnimateIcon animateOnTap completeOnStop asChild>
                    <NavLink
                      to="/location/food"
                      className={`sidebar__link sidebar__sub-link${location.pathname === "/location/food" ? " sidebar__link--active" : ""}`}
                      data-sidebar="menu-sub-button"
                      aria-label={t("Food")}
                      title={t("Food")}
                    >
                      <Utensils size={16} aria-hidden="true" />
                      <span>{t("Food")}</span>
                    </NavLink>
                  </AnimateIcon>
                </div>
              </Collapsible.Panel>
            </Collapsible.Root>
            <AnimateIcon animateOnTap completeOnStop asChild>
              <NavLink
                to="/users"
                className={`sidebar__link${location.pathname === "/users" ? " sidebar__link--active" : ""}`}
                data-sidebar="menu-button"
                aria-label={t("Users")}
                title={t("Users")}
              >
                <Users size={18} aria-hidden="true" />
                <span>{t("Users")}</span>
              </NavLink>
            </AnimateIcon>
            <Collapsible.Root
              className={`sidebar__group${location.pathname.startsWith("/sync/") ? " sidebar__group--active" : ""}`}
              open={syncOpen && !compact}
              onOpenChange={(open) => setSyncOpen(open)}
            >
              <AnimateIcon animateOnTap completeOnStop asChild>
                <Collapsible.Trigger
                  type="button"
                  className={`sidebar__link sidebar__group-toggle${location.pathname.startsWith("/sync/") && compact ? " sidebar__link--active" : ""}`}
                  onClick={() => { if (compact) onToggle(); }}
                  aria-label={t("Sync")}
                  title={t("Sync")}
                  data-sidebar="menu-button"
                >
                  <RefreshCw size={18} aria-hidden="true" />
                  <span>{t("Sync")}</span>
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`sidebar__chevron${syncOpen ? " sidebar__chevron--open" : ""}`}
                  />
                </Collapsible.Trigger>
              </AnimateIcon>
              <Collapsible.Panel className="sidebar__sub-panel" role="group" aria-label={t("Sync actions")}>
                <div className="sidebar__sub-nav">
                  <AnimateIcon animateOnTap completeOnStop asChild>
                    <NavLink
                      to="/sync/upload"
                      className={`sidebar__link sidebar__sub-link${location.pathname.startsWith("/sync/upload") ? " sidebar__link--active" : ""}`}
                      data-sidebar="menu-sub-button"
                      aria-label={t("Upload")}
                      title={t("Upload")}
                    >
                      <Upload size={16} aria-hidden="true" />
                      <span>{t("Upload")}</span>
                    </NavLink>
                  </AnimateIcon>
                  <AnimateIcon animateOnTap completeOnStop asChild>
                    <NavLink
                      to="/sync/download"
                      className={`sidebar__link sidebar__sub-link${location.pathname.startsWith("/sync/download") ? " sidebar__link--active" : ""}`}
                      data-sidebar="menu-sub-button"
                      aria-label={t("Download")}
                      title={t("Download")}
                    >
                      <Download size={16} aria-hidden="true" />
                      <span>{t("Download")}</span>
                    </NavLink>
                  </AnimateIcon>
                </div>
              </Collapsible.Panel>
            </Collapsible.Root>
          </nav>
          <div className="sidebar__footer">
            {user ? (
              <div
                ref={accountRef}
                className="sidebar__account"
                onMouseEnter={() => setAccountMenuOpen(true)}
                onMouseLeave={() => {
                  if (!accountRef.current?.contains(document.activeElement)) {
                    setAccountMenuOpen(false);
                  }
                }}
                onFocusCapture={() => setAccountMenuOpen(true)}
                onBlurCapture={(event) => {
                  if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                    setAccountMenuOpen(false);
                  }
                }}
              >
                <button
                  ref={accountTriggerRef}
                  type="button"
                  className="sidebar__account-trigger"
                  aria-expanded={accountMenuOpen}
                  aria-controls="sidebar-account-menu"
                  aria-label={t("Account menu for {username}", { username: user.username })}
                  title={user.username}
                  onClick={() => setAccountMenuOpen(true)}
                >
                  <UserAvatar user={user} className="sidebar__account-avatar" />
                  <span className="sidebar__account-details">
                    <span className="sidebar__account-name">{user.username}</span>
                    <span className="sidebar__account-role">{t(roleName)}</span>
                  </span>
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`sidebar__account-chevron${accountMenuOpen ? " sidebar__account-chevron--open" : ""}`}
                  />
                </button>
                <div
                  id="sidebar-account-menu"
                  className={`sidebar__account-menu${accountMenuOpen ? " sidebar__account-menu--open" : ""}`}
                >
                  <div className="sidebar__account-menu-user">
                    <UserAvatar user={user} className="sidebar__account-avatar" />
                    <span className="sidebar__account-details">
                      <span className="sidebar__account-name">{user.username}</span>
                      <span className="sidebar__account-role">{t(roleName)}</span>
                    </span>
                  </div>
                  <AnimateIcon animateOnTap completeOnStop asChild>
                    <NavLink
                      to="/profile"
                      className={`sidebar__link${location.pathname === "/profile" ? " sidebar__link--active" : ""}`}
                      onClick={() => setAccountMenuOpen(false)}
                      data-sidebar="menu-button"
                      aria-label={t("User profile")}
                      title={t("User profile")}
                    >
                      <Users size={18} aria-hidden="true" />
                      <span>{t("User profile")}</span>
                    </NavLink>
                  </AnimateIcon>
                  <AnimateIcon animateOnTap completeOnStop asChild>
                    <NavLink
                      to="/settings"
                      className={`sidebar__link${location.pathname === "/settings" ? " sidebar__link--active" : ""}`}
                      onClick={() => setAccountMenuOpen(false)}
                      data-sidebar="menu-button"
                      aria-label={t("Settings")}
                      title={t("Settings")}
                    >
                      <Settings size={18} aria-hidden="true" />
                      <span>{t("Settings")}</span>
                    </NavLink>
                  </AnimateIcon>
                  <AnimateIcon animateOnTap completeOnStop asChild>
                    <button
                      type="button"
                      className="sidebar__link sidebar__link--danger"
                      onClick={logout}
                      data-sidebar="menu-button"
                      aria-label={t("Log out")}
                      title={t("Log out")}
                    >
                      <LogOut size={18} aria-hidden="true" />
                      <span>{t("Log out")}</span>
                    </button>
                  </AnimateIcon>
                </div>
              </div>
            ) : null}
          </div>
        </SidebarInner>
      </Container>
      <AnimateIcon animateOnTap completeOnStop asChild>
        <button
          type="button"
          className="sidebar__toggle"
          onClick={onToggle}
          aria-label={t(collapsed ? "Expand navigation" : "Collapse navigation")}
          title={t(collapsed ? "Expand navigation" : "Collapse navigation")}
          aria-expanded={!collapsed}
          aria-controls="sidebar-navigation"
        >
          {collapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )}
        </button>
      </AnimateIcon>
    </>
  );
}
