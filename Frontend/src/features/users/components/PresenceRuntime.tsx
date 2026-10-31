import { useEffect, useState } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";
import { useLocale } from "../../../context/LocaleContext";
import { useAuthStore } from "../../../store/authStore";
import { useAlbumNotificationStore, type AlbumNotification } from "../../notifications/albumNotificationStore";
import { showBrowserNotification } from "../../notifications/browserNotifications";
import { useUploadNotificationStore } from "../../notifications/uploadNotificationStore";
import { uploadMessage } from "../../notifications/uploadMessage";
import { showToast } from "../../../components/ui/Toast";
import { userService } from "../services/userService";
import { api } from "../../../services/api";

const PRESENCE_INTERVAL_MS = 25_000;
const ACTIVITY_WINDOW_MS = 120_000;

export function PresenceRuntime() {
  const token = useAuthStore((state) => state.accessToken);
  const [accountChange, setAccountChange] = useState<"disabled" | "roleUpdated" | null>(null);
  const { t } = useLocale();

  useEffect(() => {
    if (!token) return;

    let stopped = false;
    let connection: ReturnType<HubConnectionBuilder["build"]> | undefined;
    let interval: number | undefined;
    let lastActivity = Date.now();
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
      connection.on("PublicAlbumPublished", (event: Omit<AlbumNotification, "userId" | "readAt">) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === event.ownerId) return;
        useAlbumNotificationStore.getState().add(userId, event);
        const message = t(event.created ? "{username} created public album {album}." : "{username} made album {album} public.", { username: event.username, album: event.albumName });
        void showBrowserNotification(t("Public album"), message, `/library/album/${event.albumId}`).catch(() => undefined);
      });
      connection.on("UploadBatchCompleted", (event: { batchId: string; ownerId: string; username: string; images: number; videos: number; createdAt: string }) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === event.ownerId) return;
        useUploadNotificationStore.getState().addRemote(userId, event);
        const message = uploadMessage(t, event.images, event.videos, event.username);
        showToast.info(message, { highlight: [event.username] });
        void showBrowserNotification(t("New uploads"), message, "/library/gallery").catch(() => undefined);
      });
      connection.on("AccountChanged", (reason: string) => {
        if (reason === "disabled" || reason === "roleUpdated") setAccountChange(reason);
      });
      connection.on("SessionChanged", () => {
        void api("/api/auth/me").catch(() => undefined);
      });
      try {
        await connection.start();
        if (!stopped) await connection.invoke("TrackActivity");
      } catch {
        heartbeat();
      }
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
      window.removeEventListener("pointerdown", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
      window.removeEventListener("touchstart", onUserActivity);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void connection?.stop();
    };
  }, [token, t]);

  if (!accountChange) return null;

  return (
    <AlertDialog.Root open>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" />
        <AlertDialog.Viewport className="confirmation-dialog-viewport">
          <AlertDialog.Popup className="confirmation-dialog">
            <AlertDialog.Title className="confirmation-dialog__title">
              {t(accountChange === "disabled" ? "Account disabled" : "Role updated")}
            </AlertDialog.Title>
            <AlertDialog.Description className="confirmation-dialog__message">
              {t(accountChange === "disabled"
                ? "Your account has been disabled. Reload to continue."
                : "Your role has been updated. Reload and sign in again.")}
            </AlertDialog.Description>
            <footer className="confirmation-dialog__actions">
              <button type="button" className="btn btn--primary" onClick={() => {
                useAuthStore.getState().clear();
                window.location.reload();
              }}>{t("Reload")}</button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
