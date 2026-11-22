import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Bell } from "@/components/animate-ui/icons/bell";
import { CheckCheckIcon } from "@/components/animate-ui/icons/check-check";
import { formatTimestamp } from "@/utils/media";
import { IconButton } from "@/components/ui";
import { useNotificationBell } from "@/features/notifications/useNotificationBell";
import { MobilePageLink, useOpenMobilePage } from "./layout/mobilePageNavigation";
import "./mobile-notifications.css";

function emphasizeNames(message: string, names: string[]) {
  return message.split(/(\uE000\d+\uE001)/u).map((part, index) => {
    const match = /^\uE000(\d+)\uE001$/u.exec(part);
    return match ? <strong key={index}>{names[Number(match[1])]}</strong> : part;
  });
}

export function MobileNotificationBell() {
  const location = useLocation();
  const openPage = useOpenMobilePage();
  const { language, t, open, setOpen, containerRef, triggerRef, notifications, unreadCount, describe, markAllRead, openNotification } = useNotificationBell(() => openPage("/album"));
  const notificationLabel = t(unreadCount > 0 ? "Notifications, unread items" : "Notifications");

  useEffect(() => { setOpen(false); }, [location.key, setOpen]);

  return (
    <div ref={containerRef} className="mobile-notification">
      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
        <IconButton
          ref={triggerRef}
          type="button"
          className="mobile-flat-icon-button mobile-notification__trigger"
          aria-expanded={open}
          aria-controls="notification-panel"
          aria-label={notificationLabel}
          title={notificationLabel}
          onClick={() => setOpen((value) => !value)}
        >
          <Bell size={18} fill="currentColor" aria-hidden="true" />
          {unreadCount > 0 && <span className="mobile-notification__unread-dot" aria-hidden="true" />}
        </IconButton>
      </AnimateIcon>
      {open ? (
        <section
          id="notification-panel"
          className="mobile-notification__panel"
          aria-label={t("Notifications")}
        >
          <div className="mobile-notification__header">
            <h2>{t("Notifications")}</h2>
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button type="button" className="mobile-notification__mark-read" aria-label={t("Mark all as read")} title={t("Mark all as read")} disabled={!unreadCount} onClick={markAllRead}>
                <CheckCheckIcon size={18} aria-hidden="true" />
              </button>
            </AnimateIcon>
          </div>
          {notifications.length === 0 ? (
            <p>{t("Notifications will appear here when available.")}</p>
          ) : (
            <ul className="mobile-notification__list">
              {notifications.map((notification) => {
                const { names, message } = describe(notification);
                return (
                <li key={notification.kind === "album" ? notification.eventId : notification.id}>
                  <MobilePageLink
                    to={notification.kind === "album" ? `/album/${notification.albumId}` : "/album"}
                    className={`mobile-notification__item${notification.readAt ? "" : " mobile-notification__item--unread"}`}
                    onClick={(event) => openNotification(event, notification)}
                  >
                    <span className="mobile-notification__message">{emphasizeNames(message, names)}</span>
                    <time dateTime={notification.createdAt}>
                      {formatTimestamp(notification.createdAt, language)}
                    </time>
                  </MobilePageLink>
                </li>
              ); })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
