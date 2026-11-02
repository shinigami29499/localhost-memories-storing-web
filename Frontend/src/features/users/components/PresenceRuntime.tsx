import { useEffect, useState } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { CustomDialog as AlertDialog, useCustomDialog } from "../../../components/ui/CustomDialog";
import { useLocale } from "../../../context/LocaleContext";
import { useAuthStore } from "../../../store/authStore";
import { useAlbumNotificationStore, type AlbumNotification } from "../../notifications/albumNotificationStore";
import { useUploadNotificationStore } from "../../notifications/uploadNotificationStore";
import { uploadMessage } from "../../notifications/uploadMessage";
import { showBrowserNotification } from "../../notifications/browserNotifications";
import { showToast } from "../../../components/ui/Toast";
import { userService } from "../services/userService";
import { api } from "../../../services/api";
import { useQueryClient } from "@tanstack/react-query";

const PRESENCE_INTERVAL_MS = 25_000;
const ACTIVITY_WINDOW_MS = 120_000;

export function PresenceRuntime() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [accountChange, setAccountChange] = useState<"disabled" | "roleUpdated" | null>(null);
  const { dialogProps, close, openDialog } = useCustomDialog(() => setAccountChange(null), { dismissible: false, defaultOpen: false });
  const { t } = useLocale();

  useEffect(() => {
    if (accountChange) openDialog();
  }, [accountChange, openDialog]);

  useEffect(() => {
    if (!token) return;

    let stopped = false;
    let connection: ReturnType<HubConnectionBuilder["build"]> | undefined;
    let interval: number | undefined;
    let retryTimer: number | undefined;
    let lastActivity = Date.now();
    const presence = new Map<string, boolean>();
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
    const heartbeat = () => {
      if (!stopped && document.visibilityState === "visible") void userService.heartbeat().catch(() => undefined);
    };
    const trackActivity = () => {
      lastActivity = Date.now();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") heartbeat();
    };
    const onUserActivity = () => {
      if (Date.now() - lastActivity > PRESENCE_INTERVAL_MS && document.visibilityState === "visible") heartbeat();
      trackActivity();
    };
    const start = async () => {
      connection = new HubConnectionBuilder()
        .withUrl(`${apiBase}/hubs/notifications`, { accessTokenFactory: () => useAuthStore.getState().accessToken ?? "" })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Error)
        .build();
      connection.on("UserPresenceChanged", (event: { userId: string; username: string; online: boolean }) => {
        if (event.userId === useAuthStore.getState().user?.id || !event.username) return;
        const previous = presence.get(event.userId);
        presence.set(event.userId, event.online);
        if (previous === event.online) return;
        const message = t(event.online ? "{username} is online" : "{username} went offline", { username: event.username });
        const options = { timeout: 5000, highlight: [event.username] };
        if (event.online) showToast.success(message, options);
        else showToast.error(message, options);
      });
      connection.on("PublicAlbumPublished", (event: Omit<AlbumNotification, "userId" | "readAt">) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === event.ownerId) return;
        useAlbumNotificationStore.getState().add(userId, event);
        const message = t(event.created ? "{username} created public album {album}." : "{username} made album {album} public.", { username: event.username, album: event.albumName });
        void showBrowserNotification(t("Public album"), message, `/library/album/${event.albumId}`).catch(() => undefined);
        if (window.location.pathname === "/library/album") {
          showToast.info(message, { description: t("Click to refresh."), onClick: () => {
            if (window.location.pathname === "/library/album") void queryClient.invalidateQueries({ queryKey: ["albums", "list"] });
          } });
        }
      });
      connection.on("UploadCompleted", (event: { batchId: string; ownerId: string; username: string; images: number; videos: number; createdAt: string }) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === event.ownerId || !event.username) return;
        useUploadNotificationStore.getState().addRemote(userId, event);
        const message = uploadMessage(t, event.images, event.videos, event.username);
        void showBrowserNotification(t("New uploads"), message, "/library/gallery").catch(() => undefined);
        const onGallery = isGalleryPath(window.location.pathname);
        showToast.info(message, {
          description: t(onGallery ? "Click to refresh." : "Click to go to gallery."),
          highlight: [event.username],
          onClick: () => {
            if (isGalleryPath(window.location.pathname)) {
              void queryClient.invalidateQueries({ queryKey: ["media"] });
            } else {
              window.location.assign("/library/gallery");
            }
          },
        });
      });
      connection.on("AlbumChanged", (event: { albumId: string; albumName: string; ownerId: string; actorId: string; username: string; action: "updated" | "deleted" | "private" }) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === event.actorId) return;
        const path = window.location.pathname;
        const detail = path === `/library/album/${event.albumId}`;
        if (detail && event.action === "private" && userId !== event.ownerId) {
          window.location.assign("/");
          return;
        }
        if (path !== "/library/album" && !detail) return;
        const message = event.action === "private"
          ? t("{username} made public album {album} private.", { username: event.username, album: event.albumName })
          : userId === event.ownerId
            ? t(event.action === "deleted" ? "{username} deleted your album {album}." : "{username} updated your album {album}.", { username: event.username, album: event.albumName })
            : t(event.action === "deleted" ? "{username} deleted public album {album}." : "{username} updated public album {album}.", { username: event.username, album: event.albumName });
        showToast.info(message, { id: event.action === "updated" ? `album-update:${event.albumId}:${event.actorId}:${path}` : undefined, description: t("Click to refresh."), onClick: () => {
          if (window.location.pathname === path) void queryClient.invalidateQueries({ queryKey: detail ? ["albums", "detail", event.albumId] : ["albums", "list"] });
        } });
      });
      connection.on("MediaChanged", (event: { ownerId: string; actorId: string; username: string; name: string; action: "trashed" | "restored" | "deleted" }) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === event.actorId) return;
        const path = window.location.pathname;
        if (path !== "/library/gallery" && path !== "/library/gallery/trash") return;
        if (path === "/library/gallery" && event.action === "deleted") return;
        const message = userId === event.ownerId
          ? t(event.action === "trashed" ? "{username} moved your item {item} to trash." : event.action === "deleted" ? "{username} permanently deleted your item {item}." : "{username} restored your item {item}.", { username: event.username, item: event.name })
          : t("{username} changed the gallery.", { username: event.username });
        showToast.info(message, { description: t("Click to refresh."), onClick: () => {
          if (window.location.pathname === path) void queryClient.invalidateQueries({ queryKey: ["media", path.endsWith("/trash") ? "deleted" : "all"] });
        } });
      });
      connection.on("AccountChanged", (reason: string) => {
        if (reason === "disabled" || reason === "roleUpdated") setAccountChange(reason);
      });
      connection.on("PlacesChanged", (event: { actorUserId: string }) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === event.actorUserId) return;
        void queryClient.invalidateQueries({ queryKey: ["places"] });
      });
      connection.on("PlaceCheckedIn", (event: { actorUserId: string; username: string; placeId: string; placeName: string }) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === event.actorUserId) return;
        void queryClient.invalidateQueries({ queryKey: ["places"] });
        const message = t("{username} just checked in at {place}.", { username: event.username, place: event.placeName });
        showToast.info(t("New check-in"), {
          description: message,
          highlight: [event.username, event.placeName],
          icon: "calendar-check",
        });
        void showBrowserNotification(t("New check-in"), message, "/location/place").catch(() => undefined);
      });
      connection.on("SessionChanged", () => {
        void api("/api/auth/me").catch(() => undefined);
      });
      const connect = async () => {
        if (stopped || !connection) return;
        try {
          await connection.start();
          if (stopped) {
            await connection.stop();
            return;
          }
          await connection.invoke("TrackActivity");
        } catch {
          heartbeat();
          if (!stopped && connection.state === "Disconnected") retryTimer = window.setTimeout(() => void connect(), 5_000);
        }
      };
      connection.onclose(() => {
        if (!stopped) retryTimer = window.setTimeout(() => void connect(), 5_000);
      });
      await connect();
    };

    void start();
    heartbeat();
    interval = window.setInterval(() => {
      if (Date.now() - lastActivity <= ACTIVITY_WINDOW_MS) heartbeat();
    }, PRESENCE_INTERVAL_MS);
    window.addEventListener("pointerdown", onUserActivity, { passive: true });
    window.addEventListener("keydown", onUserActivity, { passive: true });
    window.addEventListener("touchstart", onUserActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      if (interval !== undefined) window.clearInterval(interval);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      window.removeEventListener("pointerdown", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
      window.removeEventListener("touchstart", onUserActivity);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void connection?.stop();
    };
  }, [queryClient, token, t]);

  if (!accountChange) return null;

  return (
    <AlertDialog.Root {...dialogProps}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" />
        <AlertDialog.Viewport className="confirmation-dialog-viewport">
          <AlertDialog.Popup className="confirmation-dialog" role="alertdialog">
            <AlertDialog.Title className="confirmation-dialog__title">
              {t(accountChange === "disabled" ? "Account disabled" : "Role updated")}
            </AlertDialog.Title>
            <AlertDialog.Description className="confirmation-dialog__message">
              {t(accountChange === "disabled"
                ? "Your account has been disabled. Reload to continue."
                : "Your role has been updated. Reload and sign in again.")}
            </AlertDialog.Description>
            <footer className="confirmation-dialog__actions">
              <button type="button" className="btn btn--primary" onClick={() => close(() => {
                useAuthStore.getState().clear();
                window.location.reload();
              })}>{t("Reload")}</button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function isGalleryPath(pathname: string): boolean {
  return pathname === "/library/gallery"
    || pathname === "/library/gallery/videos"
    || pathname === "/library/gallery/favorites";
}
