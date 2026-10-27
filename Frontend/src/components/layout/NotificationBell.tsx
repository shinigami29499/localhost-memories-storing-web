import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AnimateIcon } from "@animate-ui/react/icons";
import { Bell } from "@/components/animate-ui/icons/bell";
import { useNotifications, notificationQueryKey } from "../../features/notifications/hooks/useNotifications";
import { notificationService } from "../../features/notifications/services/notificationService";
import type { NotificationFeed } from "../../features/notifications/types";
import { useAuthStore } from "../../store/authStore";
import { formatTimestamp } from "../../utils/media";
import { showToast } from "../ui";
import { LanguageToggleButton } from "../ui/LanguageToggleButton";
import { ThemeTogglerButton } from "../ui/ThemeTogglerButton";
import { useLocale } from "../../context/LocaleContext";

export function NotificationBell() {
  const { language, t } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const { data, isLoading, isError, refetch, liveStatus } = useNotifications();
  const notifications = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    if (!open || !accessToken) return;

    const markNotificationsAsRead = async () => {
      try {
        await notificationService.markAllRead();
      } catch {
        showToast.error(t("Could not mark notifications as read."));
      } finally {
        await refetch();
      }
    };

    void markNotificationsAsRead();
  }, [accessToken, open, refetch, t]);

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

  const markRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      queryClient.setQueryData<NotificationFeed>(notificationQueryKey(userId), (current) => {
        if (!current) return current;
        const selected = current.items.find((item) => item.id === id);
        if (!selected || selected.readAt) return current;
        return {
          ...current,
          unreadCount: Math.max(0, current.unreadCount - 1),
          items: current.items.map((item) => item.id === id
            ? { ...item, readAt: new Date().toISOString() }
            : item),
        };
      });
    } catch {
      showToast.error(t("Could not mark this notification as read."));
    }
  };

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
          <Bell size={18} aria-hidden="true" />
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
          <p className="notification-bar__connection" role="status">
            {liveStatus === "connected" ? t("Live updates connected") : t("Live updates reconnecting")}
          </p>
          {isLoading ? <p>{t("Loading notifications…")}</p> : null}
          {isError ? (
            <p role="alert">
              {t("Could not load notifications.")}{" "}
              <button type="button" className="notification-bar__retry" onClick={() => void refetch()}>
                {t("Try again")}
              </button>
            </p>
          ) : null}
          {!isLoading && !isError && notifications.length === 0 ? (
            <p>{t("Notifications will appear here when available.")}</p>
          ) : null}
          {notifications.length > 0 ? (
            <ul className="notification-bar__list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    to={`/posts/${notification.postId}`}
                    className={`notification-bar__item${notification.readAt ? "" : " notification-bar__item--unread"}`}
                    onClick={() => {
                      setOpen(false);
                      if (!notification.readAt) void markRead(notification.id);
                    }}
                  >
                    <span className="notification-bar__message">
                      <strong>{notification.actorUsername}</strong>{" "}
                      {t(notification.notificationType === "CommentAdded"
                        ? "commented on your post"
                        : notification.notificationType === "ReactionAdded"
                          ? "reacted to your post"
                          : "shared a new post")}
                    </span>
                    {notification.postCaption ? (
                      <span className="notification-bar__caption">{notification.postCaption}</span>
                    ) : null}
                    <time dateTime={notification.createdAt}>
                      {formatTimestamp(notification.createdAt, language)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
