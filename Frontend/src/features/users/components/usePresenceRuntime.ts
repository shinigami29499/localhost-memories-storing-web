import { useEffect, useRef, useState } from "react";
import { createNotificationTransport } from "../../../../packages/core/src/notificationTransport";
import { CustomDialog as AlertDialog, useCustomDialog } from "../../../components/ui/CustomDialog";
import { Button } from "../../../components/ui/Button";
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
import { useUserPresenceStore } from "../store/userPresenceStore";

const PRESENCE_INTERVAL_MS = 25_000;
const ACTIVITY_WINDOW_MS = 120_000;
const presenceStorageKey = "shinigacim.user-presence";

function readPresenceCache(): Map<string, boolean> {
  try {
    const value = sessionStorage.getItem(presenceStorageKey);
    const parsed: unknown = value ? JSON.parse(value) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return new Map();
    return new Map(Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"));
  } catch {
    return new Map();
  }
}

function writePresenceCache(presence: Map<string, boolean>): void {
  try {
    sessionStorage.setItem(presenceStorageKey, JSON.stringify(Object.fromEntries(presence)));
  } catch {
    // Presence toasts still work for the lifetime of the current runtime.
  }
}

export function usePresenceRuntime() {
  const authenticated = useAuthStore((state) => Boolean(state.accessToken));
  const accountId = useAuthStore((state) => state.user?.id);
  const accountStatus = useAuthStore((state) => state.user?.status);
  const queryClient = useQueryClient();
  const [accountChange, setAccountChange] = useState<"disabled" | "roleUpdated" | null>(null);
  const { dialogProps, close, openDialog } = useCustomDialog(() => setAccountChange(null), { dismissible: false, defaultOpen: false });
  const { t } = useLocale();
  const translateRef = useRef(t);
  translateRef.current = t;

  useEffect(() => {
    if (accountChange) openDialog();
  }, [accountChange, openDialog]);

  useEffect(() => {
    if (!authenticated) return;

    const translate = (key: string, values?: Record<string, string | number>) => translateRef.current(key, values);

    let stopped = false;
    let interval: number | undefined;
    let lastActivity = Date.now();
    const presence = readPresenceCache();
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
    const transport = createNotificationTransport({
      apiBase,
      getAccessToken: () => useAuthStore.getState().accessToken ?? "",
      onFailure: heartbeat,
      configure: (connection) => {
        connection.on("UsersChanged", (userId: string, resetPresence: boolean) => {
          if (resetPresence) useUserPresenceStore.getState().setOnline(userId, false);
          void queryClient.invalidateQueries({ queryKey: ["users"] });
        });
        connection.onreconnected(() => {
          heartbeat();
          void queryClient.invalidateQueries({ queryKey: ["users"] });
        });
        connection.on("UserPresenceChanged", (event: { userId: string; username: string; online: boolean; lastSeenAt: string | null }) => {
          if (event.userId === useAuthStore.getState().user?.id || !event.username) return;
          useUserPresenceStore.getState().setOnline(event.userId, event.online, event.lastSeenAt);
          const previous = presence.get(event.userId);
          presence.set(event.userId, event.online);
          writePresenceCache(presence);
          if (previous === undefined || previous === event.online) return;
          const message = translate(event.online ? "{username} is online" : "{username} went offline", { username: event.username });
          const options = { timeout: 5000, highlight: [event.username] };
          if (event.online) showToast.success(message, options);
          else showToast.error(message, options);
        });
        connection.on("PublicAlbumPublished", (event: Omit<AlbumNotification, "userId" | "readAt">) => {
          const userId = useAuthStore.getState().user?.id;
          if (!userId || userId === event.ownerId) return;
          useAlbumNotificationStore.getState().add(userId, event);
          const message = translate(event.created ? "{username} created public album {album}." : "{username} made album {album} public.", { username: event.username, album: event.albumName });
          void showBrowserNotification(translate("Public album"), message, `/gallery/album/${event.albumId}`).catch(() => undefined);
          if (window.location.pathname === "/gallery/album") {
            showToast.info(message, { description: translate("Click to refresh."), onClick: () => {
              if (window.location.pathname === "/gallery/album") void queryClient.invalidateQueries({ queryKey: ["albums"] });
            } });
          }
        });
        connection.on("UploadCompleted", (event: { batchId: string; ownerId: string; username: string; images: number; videos: number; createdAt: string }) => {
          const userId = useAuthStore.getState().user?.id;
          if (!userId || userId === event.ownerId || !event.username) return;
          useUploadNotificationStore.getState().addRemote(userId, event);
          const message = uploadMessage(translate, event.images, event.videos, event.username);
          void showBrowserNotification(translate("New uploads"), message, "/gallery").catch(() => undefined);
          const onGallery = isGalleryPath(window.location.pathname);
          showToast.info(message, {
            description: translate(onGallery ? "Click to refresh." : "Click to go to gallery."),
            highlight: [event.username],
            onClick: () => {
              if (isGalleryPath(window.location.pathname)) {
                void queryClient.invalidateQueries({ queryKey: ["media"] });
              } else {
                window.location.assign("/gallery");
              }
            },
          });
        });
        const refreshAlbumMedia = () => {
          void queryClient.invalidateQueries({ queryKey: ["albums"] });
          void queryClient.invalidateQueries({ queryKey: ["media"] });
          void queryClient.invalidateQueries({ queryKey: ["places"] });
          void queryClient.invalidateQueries({ queryKey: ["picker-image"] });
        };
        connection.on("AlbumMediaRemoved", refreshAlbumMedia);
        connection.on("AlbumChanged", (event: { albumId: string; albumName: string; ownerId: string; actorId: string; username: string; action: "updated" | "deleted" | "private" | "media" }) => {
          const userId = useAuthStore.getState().user?.id;
          if (!userId) return;
          if (event.action === "media") {
            refreshAlbumMedia();
            return;
          }
          if (userId === event.actorId) return;
          const path = window.location.pathname;
          const detail = path === `/gallery/album/${event.albumId}`;
          if (detail && event.action === "private" && userId !== event.ownerId) {
            window.location.assign("/");
            return;
          }
          if (event.action === "deleted") refreshAlbumMedia();
          if (path !== "/gallery" && path !== "/gallery/album" && !detail) return;
          const message = event.action === "private"
            ? translate("{username} made public album {album} private.", { username: event.username, album: event.albumName })
            : userId === event.ownerId
              ? translate(event.action === "deleted" ? "{username} deleted your album {album}." : "{username} updated your album {album}.", { username: event.username, album: event.albumName })
              : translate(event.action === "deleted" ? "{username} deleted public album {album}." : "{username} updated public album {album}.", { username: event.username, album: event.albumName });
          showToast.info(message, { id: event.action === "updated" ? `album-update:${event.albumId}:${event.actorId}:${path}` : undefined, description: translate("Click to refresh."), onClick: () => {
            if (window.location.pathname === path) void queryClient.invalidateQueries({ queryKey: detail ? ["albums", "detail", event.albumId] : ["albums"] });
          } });
        });
        connection.on("AccountChanged", (reason: string) => {
          if (reason === "disabled" || reason === "roleUpdated") setAccountChange(reason);
          if (reason === "approvalUpdated") void userService.profile().then((user) => useAuthStore.getState().updateUser(user)).catch(() => undefined);
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
          const message = translate("{username} just checked in at {place}.", { username: event.username, place: event.placeName });
          showToast.info(translate("New check-in"), {
            description: message,
            highlight: [event.username, event.placeName],
            icon: "calendar-check",
          });
          void showBrowserNotification(translate("New check-in"), message, "/location").catch(() => undefined);
        });
        connection.on("SessionChanged", () => {
          void api("/api/auth/me").catch(() => undefined);
        });
      },
    });
    transport.start();
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
      useUserPresenceStore.getState().clear();
      transport.stop();
    };
  }, [queryClient, authenticated, accountId, accountStatus]);

  const reload = () => close(() => {
    useAuthStore.getState().clear();
    window.location.reload();
  });

  return { accountChange, dialogProps, reload, t };
}

function isGalleryPath(pathname: string): boolean {
  return pathname === "/gallery"
    || pathname === "/gallery/videos"
    || pathname === "/gallery/album";
}
