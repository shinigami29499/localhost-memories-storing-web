import { useEffect, useRef, useState } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { Download } from "@/components/animate-ui/icons/download";
import { FileText } from "@/components/animate-ui/icons/file-text";
import { Home } from "@/components/animate-ui/icons/home";
import { LogOut } from "@/components/animate-ui/icons/log-out";
import { PanelLeftClose } from "@/components/animate-ui/icons/panel-left-close";
import { PanelLeftOpen } from "@/components/animate-ui/icons/panel-left-open";
import { RefreshCw } from "@/components/animate-ui/icons/refresh-cw";
import { ShieldCheck } from "@/components/animate-ui/icons/shield-check";
import { Upload } from "@/components/animate-ui/icons/upload";
import { Users } from "@/components/animate-ui/icons/users";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { authService } from "../../features/auth";
import { showToast } from "../ui";
import { Brand } from "./Brand";
import { Container, Gap, Highlight } from "@animate-ui/react/primitives/sidebar";
import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";
import { useLocale } from "../../context/LocaleContext";

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

  const isAdminRoute = location.pathname.startsWith("/admin");
  const [syncOpen, setSyncOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(isAdminRoute);
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
      <Container className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
        <SidebarInner className="sidebar__inner">
          <div className="sidebar__brand">
            <Brand />
          </div>
          <nav id="sidebar-navigation" className="sidebar__nav" aria-label={t("Main navigation")}>
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <NavLink
                to="/"
                className={`sidebar__link${location.pathname === "/" ? " sidebar__link--active" : ""}`}
                end
                data-sidebar="menu-button"
                aria-label={t("Feed")}
                title={t("Feed")}
              >
                <Home size={18} aria-hidden="true" />
                <span>{t("Feed")}</span>
              </NavLink>
            </AnimateIcon>
            {isAdmin ? (
              <Collapsible.Root
                className={`sidebar__group${isAdminRoute ? " sidebar__group--active" : ""}`}
                open={adminOpen && !compact}
                onOpenChange={(open) => setAdminOpen(open)}
              >
                <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                  <Collapsible.Trigger
                    type="button"
                    className={`sidebar__link sidebar__group-toggle${isAdminRoute && collapsed ? " sidebar__link--active" : ""}`}
                    onClick={() => { if (compact) onToggle(); }}
                    aria-label={t("Admin")}
                    title={t("Admin")}
                    data-sidebar="menu-button"
                  >
                    <ShieldCheck size={18} aria-hidden="true" />
                    <span>{t("Admin")}</span>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className={`sidebar__chevron${adminOpen ? " sidebar__chevron--open" : ""}`}
                    />
                  </Collapsible.Trigger>
                </AnimateIcon>
                <Collapsible.Panel className="sidebar__sub-panel" role="group" aria-label={t("Admin pages")}>
                  <div className="sidebar__sub-nav">
                    <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                      <NavLink
                        to="/admin/users"
                        className={`sidebar__link sidebar__sub-link${location.pathname === "/admin/users" ? " sidebar__link--active" : ""}`}
                        data-sidebar="menu-sub-button"
                      >
                        <Users size={16} aria-hidden="true" />
                        <span>{t("Manage users")}</span>
                      </NavLink>
                    </AnimateIcon>
                    <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                      <NavLink
                        to="/admin/posts"
                        className={`sidebar__link sidebar__sub-link${location.pathname === "/admin/posts" ? " sidebar__link--active" : ""}`}
                        data-sidebar="menu-sub-button"
                      >
                        <FileText size={16} aria-hidden="true" />
                        <span>{t("Manage posts")}</span>
                      </NavLink>
                    </AnimateIcon>
                  </div>
                </Collapsible.Panel>
              </Collapsible.Root>
            ) : null}
            <Collapsible.Root
              className={`sidebar__group${location.pathname.startsWith("/uploads") ? " sidebar__group--active" : ""}`}
              open={syncOpen && !compact}
              onOpenChange={(open) => setSyncOpen(open)}
            >
              <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                <Collapsible.Trigger
                  type="button"
                  className={`sidebar__link sidebar__group-toggle${location.pathname.startsWith("/uploads") && compact ? " sidebar__link--active" : ""}`}
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
                  <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                    <NavLink
                      to="/uploads"
                      className={`sidebar__link sidebar__sub-link${location.pathname.startsWith("/uploads") ? " sidebar__link--active" : ""}`}
                      data-sidebar="menu-sub-button"
                      aria-label={t("Upload")}
                      title={t("Upload")}
                    >
                      <Upload size={16} aria-hidden="true" />
                      <span>{t("Upload")}</span>
                    </NavLink>
                  </AnimateIcon>
                  <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                    <div className="sidebar__link sidebar__sub-link sidebar__link--static" aria-disabled="true">
                      <Download size={16} aria-hidden="true" />
                      <span>{t("Download")}</span>
                    </div>
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
                  <span className="sidebar__account-avatar" aria-hidden="true">
                    {user.username.slice(0, 1).toUpperCase()}
                  </span>
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
                    <span className="sidebar__account-avatar" aria-hidden="true">
                      {user.username.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="sidebar__account-details">
                      <span className="sidebar__account-name">{user.username}</span>
                      <span className="sidebar__account-role">{t(roleName)}</span>
                    </span>
                  </div>
                  <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
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
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
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
