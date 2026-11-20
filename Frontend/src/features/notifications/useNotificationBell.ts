import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAlbumNotificationStore } from "./albumNotificationStore";
import { useUploadNotificationStore } from "./uploadNotificationStore";
import { uploadService } from "../uploads/services/uploadService";
import { uploadMessage } from "./uploadMessage";
import { useAuthStore } from "../../store/authStore";
import { useLocale } from "../../context/LocaleContext";

export function useNotificationBell(navigateToGallery = () => window.location.assign("/gallery")) {
  const { language, t } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const uploadItems = useUploadNotificationStore((state) => state.items);
  const markUploadsRead = useUploadNotificationStore((state) => state.markRead);
  const albumItems = useAlbumNotificationStore((state) => state.items);
  const markAlbumsRead = useAlbumNotificationStore((state) => state.markRead);
  const notifications = [
    ...uploadItems.filter((item) => item.userId === userId).map((item) => ({ ...item, kind: "upload" as const })),
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

  type Notification = (typeof notifications)[number];
  const describe = (notification: Notification) => {
    const names = notification.kind === "album" ? [notification.username, notification.albumName] : notification.kind === "upload" && notification.username ? [notification.username] : [];
    const message = notification.kind === "upload"
      ? notification.images === undefined ? t("Upload batch completed") : (notification.failedFiles ?? 0) || (notification.cancelledFiles ?? 0)
        ? t("Upload batch finished: {failed} failed, {cancelled} cancelled.", { failed: notification.failedFiles ?? 0, cancelled: notification.cancelledFiles ?? 0 })
        : uploadMessage(t, notification.images, notification.videos ?? 0, notification.username ? "\uE0000\uE001" : undefined)
      : t(notification.created ? "{username} created public album {album}." : "{username} made album {album} public.", { username: "\uE0000\uE001", album: "\uE0001\uE001" });
    return { names, message };
  };
  const markAllRead = () => {
    if (userId) {
      markUploadsRead(userId); markAlbumsRead(userId);
      void uploadService.markAllBatchesViewed().then(() => queryClient.invalidateQueries({ queryKey: ["uploads"] })).catch(() => undefined);
    }
  };
  const openNotification = (event: MouseEvent<HTMLAnchorElement>, notification: Notification) => {
    setOpen(false);
    if (notification.kind === "upload") {
      event.preventDefault();
      let markViewed = Promise.resolve();
      if (userId && !notification.readAt) {
        markUploadsRead(userId, notification.id);
        if (!notification.username) {
          markViewed = uploadService.markBatchViewed(notification.id.slice(notification.id.lastIndexOf(":") + 1));
        }
      }
      void markViewed.catch(() => undefined).finally(navigateToGallery);
      return;
    }
    if (userId && !notification.readAt) markAlbumsRead(userId, notification.eventId);
  };
  return { language, t, open, setOpen, containerRef, triggerRef, notifications, unreadCount, describe, markAllRead, openNotification };
}
