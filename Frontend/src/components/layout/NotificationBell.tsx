import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Bell } from "@/components/animate-ui/icons/bell";
import { CheckCheckIcon } from "@/components/animate-ui/icons/check-check";
import { useAlbumNotificationStore } from "../../features/notifications/albumNotificationStore";
import { useUploadNotificationStore } from "../../features/notifications/uploadNotificationStore";
import { useDownloadNotificationStore } from "../../features/notifications/downloadNotificationStore";
import { uploadMessage } from "../../features/notifications/uploadMessage";
import { useAuthStore } from "../../store/authStore";
import { formatTimestamp } from "../../utils/media";
import { LanguageToggleButton } from "../ui/LanguageToggleButton";
import { ThemeTogglerButton } from "../ui/ThemeTogglerButton";
import { useLocale } from "../../context/LocaleContext";
import "./control-bar.css";

function emphasizeNames(message: string, names: string[]) {
  return message.split(/(\uE000\d+\uE001)/u).map((part, index) => {
    const match = /^\uE000(\d+)\uE001$/u.exec(part);
    return match ? <strong key={index}>{names[Number(match[1])]}</strong> : part;
  });
}

export function NotificationBell() {
  const { language, t } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const userId = useAuthStore((state) => state.user?.id);
  const uploadItems = useUploadNotificationStore((state) => state.items);
  const markUploadsRead = useUploadNotificationStore((state) => state.markRead);
  const downloadItems = useDownloadNotificationStore((state) => state.items);
  const markDownloadsRead = useDownloadNotificationStore((state) => state.markRead);
  const albumItems = useAlbumNotificationStore((state) => state.items);
  const markAlbumsRead = useAlbumNotificationStore((state) => state.markRead);
  const notifications = [
    ...uploadItems.filter((item) => item.userId === userId).map((item) => ({ ...item, kind: "upload" as const })),
    ...downloadItems.filter((item) => item.userId === userId).map((item) => ({ ...item, kind: "download" as const })),
    ...albumItems.filter((item) => item.userId === userId).map((item) => ({ ...item, kind: "album" as const })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadCount = notifications.filter((item) => !item.readAt).length;

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
    <div ref={containerRef} className="notification-bar control-bar">
      <ThemeTogglerButton />
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
              <button type="button" className="notification-bar__mark-read" aria-label={t("Mark all as read")} title={t("Mark all as read")} disabled={!unreadCount} onClick={() => { if (userId) { markUploadsRead(userId); markDownloadsRead(userId); markAlbumsRead(userId); } }}>
                <CheckCheckIcon size={18} aria-hidden="true" />
              </button>
            </AnimateIcon>
          </div>
          {notifications.length === 0 ? (
            <p>{t("Notifications will appear here when available.")}</p>
          ) : (
            <ul className="notification-bar__list">
              {notifications.map((notification) => {
                const names = notification.kind === "album" ? [notification.username, notification.albumName] : notification.kind === "upload" && notification.username ? [notification.username] : [];
                const message = notification.kind === "upload"
                  ? notification.images === undefined ? t("Upload batch completed") : (notification.failedFiles ?? 0) || (notification.cancelledFiles ?? 0)
                    ? t("Upload batch finished: {failed} failed, {cancelled} cancelled.", { failed: notification.failedFiles ?? 0, cancelled: notification.cancelledFiles ?? 0 })
                    : uploadMessage(t, notification.images, notification.videos ?? 0, notification.username ? "\uE0000\uE001" : undefined)
                  : notification.kind === "download"
                    ? t("Download batch finished: {success} sent to browser, {failed} failed.", { success: notification.successfulFiles, failed: notification.failedFiles })
                    : t(notification.created ? "{username} created public album {album}." : "{username} made album {album} public.", { username: "\uE0000\uE001", album: "\uE0001\uE001" });
                return (
                <li key={notification.kind === "album" ? notification.eventId : notification.id}>
                  <Link
                    to={notification.kind === "album" ? `/library/album/${notification.albumId}` : notification.kind === "download" ? "/sync/download" : notification.username ? "/library/gallery" : "/sync/upload"}
                    className={`notification-bar__item${notification.readAt ? "" : " notification-bar__item--unread"}`}
                    onClick={() => {
                      setOpen(false);
                      if (userId && !notification.readAt && notification.kind === "upload") markUploadsRead(userId, notification.id);
                      if (userId && !notification.readAt && notification.kind === "download") markDownloadsRead(userId, notification.id);
                      if (userId && !notification.readAt && notification.kind === "album") markAlbumsRead(userId, notification.eventId);
                    }}
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
