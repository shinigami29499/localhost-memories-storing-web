import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Bell } from "@/components/animate-ui/icons/bell";
import { useUploadNotificationStore } from "../../features/notifications/uploadNotificationStore";
import { useAuthStore } from "../../store/authStore";
import { formatTimestamp } from "../../utils/media";
import { LanguageToggleButton } from "../ui/LanguageToggleButton";
import { ThemeTogglerButton } from "../ui/ThemeTogglerButton";
import { useLocale } from "../../context/LocaleContext";

export function NotificationBell() {
  const { language, t } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const userId = useAuthStore((state) => state.user?.id);
  const uploadItems = useUploadNotificationStore((state) => state.items);
  const markUploadsRead = useUploadNotificationStore((state) => state.markRead);
  const notifications = uploadItems.filter((item) => item.userId === userId);
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  useEffect(() => {
    if (open && userId) markUploadsRead(userId);
  }, [open, userId, markUploadsRead]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="notification-bar">
      <ThemeTogglerButton />
      <LanguageToggleButton />
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <button
          ref={triggerRef}
          type="button"
          className="notification-bar__trigger"
          aria-expanded={open}
          aria-controls="notification-panel"
          aria-label={unreadCount > 0 ? t("Notifications, {count} unread", { count: unreadCount }) : t("Notifications")}
          title={unreadCount > 0 ? t("{count} unread notifications", { count: unreadCount }) : t("Notifications")}
          onClick={() => setOpen((value) => !value)}
        >
          <Bell size={18} fill="currentColor" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="notification-bar__badge" aria-hidden="true">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </AnimateIcon>
      {open ? (
        <section
          id="notification-panel"
          className="notification-bar__panel"
          aria-label={t("Notifications")}
        >
          <h2>{t("Notifications")}</h2>
          {notifications.length === 0 ? (
            <p>{t("Notifications will appear here when available.")}</p>
          ) : (
            <ul className="notification-bar__list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    to="/uploads"
                    className={`notification-bar__item${notification.readAt ? "" : " notification-bar__item--unread"}`}
                    onClick={() => {
                      setOpen(false);
                      if (userId && !notification.readAt) markUploadsRead(userId, notification.id);
                    }}
                  >
                    <span className="notification-bar__message">{t("Upload batch completed")}</span>
                    <time dateTime={notification.createdAt}>
                      {formatTimestamp(notification.createdAt, language)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
