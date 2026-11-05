import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { UploadActivityHeatmap } from "../../features/uploads/components/UploadActivityHeatmap";
import { Home } from "@/components/animate-ui/icons/home";
import { LibraryBig } from "@/components/animate-ui/icons/library-big";
import { LogOut } from "@/components/animate-ui/icons/log-out";
import { MapPin } from "@/components/animate-ui/icons/map-pin";
import { PanelLeftClose } from "@/components/animate-ui/icons/panel-left-close";
import { PanelLeftOpen } from "@/components/animate-ui/icons/panel-left-open";
import { Settings } from "@/components/animate-ui/icons/settings";
import { Upload } from "@/components/animate-ui/icons/upload";
import { Users } from "@/components/animate-ui/icons/users";
import { UserRound } from "@/components/animate-ui/icons/user-round";
import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useLogout } from "../../features/auth/hooks/useLogout";
import { Brand } from "./Brand";
import { useLocale } from "../../context/LocaleContext";
import { UserAvatar } from "../common/UserAvatar";
import { useUnreadUploads } from "../../features/uploads/hooks/useUnreadUploads";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

export function Sidebar({ collapsed, onToggle, isMobile = false }: SidebarProps) {
  const logout = useLogout();
  const { t } = useLocale();
  const uploadCounts = useUnreadUploads();
  const countColumnWidths = (["success", "pending", "failed"] as const)
    .map((status) => `${Math.max(String(uploadCounts[status]).length, 2) + 1.5}ch`)
    .join(" ");
  const countStyle = { gridTemplateColumns: countColumnWidths } satisfies CSSProperties;
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const locationsActive = location.pathname === "/location" || location.pathname.startsWith("/location/");
  const libraryActive = location.pathname === "/gallery" || location.pathname.startsWith("/gallery/");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const compact = collapsed && !isMobile;
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

  return (
    <>
      <div className="sidebar-gap" aria-hidden="true" />
      <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`} inert={isMobile && collapsed}>
        <div className="sidebar__inner">
          <div className="sidebar__brand">
            <Brand />
          </div>
          <nav id="sidebar-navigation" className="sidebar__nav" aria-label={t("Main navigation")}>
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
              <NavLink to="/gallery" className={`sidebar__link${libraryActive ? " sidebar__link--active" : ""}`}
                data-sidebar="menu-button" aria-label={t("Gallery")} title={t("Gallery")}>
                <LibraryBig size={18} aria-hidden="true" /><span>{t("Gallery")}</span>
              </NavLink>
              <NavLink to="/location" className={`sidebar__link${locationsActive ? " sidebar__link--active" : ""}`}
                data-sidebar="menu-button" aria-label={t("Locations")} title={t("Locations")}>
                <MapPin size={18} aria-hidden="true" />
                <span>{t("Locations")}</span>
              </NavLink>
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
              <NavLink to="/uploads" className={`sidebar__link${location.pathname.startsWith("/uploads") ? " sidebar__link--active" : ""}`} data-sidebar="menu-button" aria-label={t("Upload")} title={t("Upload")}>
                <Upload size={18} aria-hidden="true" /><span>{t("Upload")}</span>
                {(uploadCounts.success > 0 || uploadCounts.pending > 0 || uploadCounts.failed > 0) && <span className="sidebar__upload-counts" style={countStyle}>
                  {(["success", "pending", "failed"] as const).map((status) => <span key={status} className={`sidebar__upload-count sidebar__upload-count--${status}`} aria-label={`${t(status === "success" ? "Success" : status === "pending" ? "Pending upload" : "Failed")}: ${uploadCounts[status]}`}>{uploadCounts[status]}</span>)}
                </span>}
              </NavLink>
            {!compact && (
              <section className="sidebar__activity" aria-labelledby="sidebar-activity-title">
                <h2 id="sidebar-activity-title">{t("Upload activity")}</h2>
                <UploadActivityHeatmap compact />
              </section>
            )}
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
                  <UserAvatar user={user} className="sidebar__account-avatar sidebar__account-avatar--trigger" />
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
                          <NavLink
                      to="/profile"
                      className={`sidebar__link${location.pathname === "/profile" ? " sidebar__link--active" : ""}`}
                      onClick={() => setAccountMenuOpen(false)}
                      aria-label={t("User profile")}
                      title={t("User profile")}
                    >
                      <UserRound size={18} aria-hidden="true" />
                      <span>{t("User profile")}</span>
                    </NavLink>
                                <NavLink
                      to="/settings"
                      className={`sidebar__link${location.pathname === "/settings" ? " sidebar__link--active" : ""}`}
                      onClick={() => setAccountMenuOpen(false)}
                      aria-label={t("Settings")}
                      title={t("Settings")}
                    >
                      <Settings size={18} aria-hidden="true" />
                      <span>{t("Settings")}</span>
                    </NavLink>
                                <button
                      type="button"
                      className="sidebar__link sidebar__link--danger"
                      onClick={logout}
                      aria-label={t("Log out")}
                      title={t("Log out")}
                    >
                      <LogOut size={18} aria-hidden="true" />
                      <span>{t("Log out")}</span>
                    </button>
                      </div>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
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
    </>
  );
}
