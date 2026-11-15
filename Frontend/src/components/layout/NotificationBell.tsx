import { Link } from "react-router-dom";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Bell } from "@/components/animate-ui/icons/bell";
import { CheckCheckIcon } from "@/components/animate-ui/icons/check-check";
import { formatTimestamp } from "../../utils/media";
import { LanguageToggleButton } from "../ui/LanguageToggleButton";
import { useNotificationBell } from "../../features/notifications/useNotificationBell";
import "./control-bar.css";

function emphasizeNames(message: string, names: string[]) {
  return message.split(/(\uE000\d+\uE001)/u).map((part, index) => {
    const match = /^\uE000(\d+)\uE001$/u.exec(part);
    return match ? <strong key={index}>{names[Number(match[1])]}</strong> : part;
  });
}

export function NotificationBell() {
  const { language, t, open, setOpen, containerRef, triggerRef, notifications, unreadCount, describe, markAllRead, openNotification } = useNotificationBell();

  return (
    <div ref={containerRef} className="notification-bar control-bar">
      <LanguageToggleButton />
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <button
          ref={triggerRef}
          type="button"
          className="notification-bar__trigger control-bar__action"
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
          <div className="notification-bar__header">
            <h2>{t("Notifications")}</h2>
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button type="button" className="notification-bar__mark-read" aria-label={t("Mark all as read")} title={t("Mark all as read")} disabled={!unreadCount} onClick={markAllRead}>
                <CheckCheckIcon size={18} aria-hidden="true" />
              </button>
            </AnimateIcon>
          </div>
          {notifications.length === 0 ? (
            <p>{t("Notifications will appear here when available.")}</p>
          ) : (
            <ul className="notification-bar__list">
              {notifications.map((notification) => {
                const { names, message } = describe(notification);
                return (
                <li key={notification.kind === "album" ? notification.eventId : notification.id}>
                  <Link
                    to={notification.kind === "album" ? `/gallery/album/${notification.albumId}` : "/gallery"}
                    className={`notification-bar__item${notification.readAt ? "" : " notification-bar__item--unread"}`}
                    onClick={(event) => openNotification(event, notification)}
                  >
                    <span className="notification-bar__message">{emphasizeNames(message, names)}</span>
                    <time dateTime={notification.createdAt}>
                      {formatTimestamp(notification.createdAt, language)}
                    </time>
                  </Link>
                </li>
              ); })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
