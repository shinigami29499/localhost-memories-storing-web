import { useEffect, useRef, useState } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { FileText } from "@/components/animate-ui/icons/file-text";
import { Home } from "@/components/animate-ui/icons/home";
import { LogOut } from "@/components/animate-ui/icons/log-out";
import { PanelLeftClose } from "@/components/animate-ui/icons/panel-left-close";
import { PanelLeftOpen } from "@/components/animate-ui/icons/panel-left-open";
import { ShieldCheck } from "@/components/animate-ui/icons/shield-check";
import { Users } from "@/components/animate-ui/icons/users";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { authService } from "../../features/auth";
import { showToast } from "../ui";
import { ThemeTogglerButton } from "../ui/ThemeTogglerButton";
import { Brand } from "./Brand";
import { Container, Gap, Highlight } from "@animate-ui/react/primitives/sidebar";
import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const isAdminRoute = location.pathname.startsWith("/admin");
  const [adminOpen, setAdminOpen] = useState(isAdminRoute);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
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
      showToast.success("Logout successfully");
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      <Gap className="sidebar-gap" aria-hidden="true" />
      <Container className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
        <Highlight className="sidebar__inner">
          <div className="sidebar__brand">
            <Brand />
          </div>
          <nav id="sidebar-navigation" className="sidebar__nav" aria-label="Main navigation">
            <AnimateIcon animateOnHover asChild>
              <NavLink
                to="/"
                className={`sidebar__link${location.pathname === "/" ? " sidebar__link--active" : ""}`}
                end
                data-sidebar="menu-button"
                aria-label="Feed"
                title="Feed"
              >
                <Home size={18} aria-hidden="true" />
                <span>Feed</span>
              </NavLink>
            </AnimateIcon>
            {isAdmin ? (
              <Collapsible.Root
                className={`sidebar__group${isAdminRoute ? " sidebar__group--active" : ""}`}
                open={adminOpen && !collapsed}
                onOpenChange={(open) => setAdminOpen(open)}
              >
                <AnimateIcon animateOnHover asChild>
                  <Collapsible.Trigger
                    type="button"
                    className={`sidebar__link sidebar__group-toggle${isAdminRoute && collapsed ? " sidebar__link--active" : ""}`}
                    onClick={() => { if (collapsed) onToggle(); }}
                    aria-label="Admin"
                    title="Admin"
                    data-sidebar="menu-button"
                  >
                    <ShieldCheck size={18} aria-hidden="true" />
                    <span>Admin</span>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className={`sidebar__chevron${adminOpen ? " sidebar__chevron--open" : ""}`}
                    />
                  </Collapsible.Trigger>
                </AnimateIcon>
                <Collapsible.Panel className="sidebar__sub-panel" role="group" aria-label="Admin pages">
                  <div className="sidebar__sub-nav">
                    <AnimateIcon animateOnHover asChild>
                      <NavLink
                        to="/admin/users"
                        className={`sidebar__link sidebar__sub-link${location.pathname === "/admin/users" ? " sidebar__link--active" : ""}`}
                        data-sidebar="menu-sub-button"
                      >
                        <Users size={16} aria-hidden="true" />
                        <span>Manage users</span>
                      </NavLink>
                    </AnimateIcon>
                    <AnimateIcon animateOnHover asChild>
                      <NavLink
                        to="/admin/posts"
                        className={`sidebar__link sidebar__sub-link${location.pathname === "/admin/posts" ? " sidebar__link--active" : ""}`}
                        data-sidebar="menu-sub-button"
                      >
                        <FileText size={16} aria-hidden="true" />
                        <span>Manage posts</span>
                      </NavLink>
                    </AnimateIcon>
                  </div>
                </Collapsible.Panel>
              </Collapsible.Root>
            ) : null}
          </nav>
          <div className="sidebar__footer">
            <ThemeTogglerButton />
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
                  aria-label={`Account menu for ${user.username}`}
                  title={user.username}
                  onClick={() => setAccountMenuOpen(true)}
                >
                  <span className="sidebar__account-avatar" aria-hidden="true">
                    {user.username.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="sidebar__account-details">
                    <span className="sidebar__account-name">{user.username}</span>
                    <span className="sidebar__account-role">{roleName}</span>
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
                      <span className="sidebar__account-role">{roleName}</span>
                    </span>
                  </div>
                  <AnimateIcon animateOnHover asChild>
                    <button
                      type="button"
                      className="sidebar__link sidebar__link--danger"
                      onClick={logout}
                      data-sidebar="menu-button"
                      aria-label="Log out"
                      title="Log out"
                    >
                      <LogOut size={18} aria-hidden="true" />
                      <span>Log out</span>
                    </button>
                  </AnimateIcon>
                </div>
              </div>
            ) : null}
          </div>
        </Highlight>
      </Container>
      <AnimateIcon animateOnHover asChild>
        <button
          type="button"
          className="sidebar__toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
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
