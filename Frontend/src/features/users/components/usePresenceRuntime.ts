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
    const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
    const heartbeat = () => {
      if (!stopped && document.visibilityState === "visible") void userService.heartbeat().catch(() => undefined);
    };
    const onUserActivity = () => heartbeat();
    const transport = createNotificationTransport({
      apiBase,
      getAccessToken: () => useAuthStore.getState().accessToken ?? "",
      onFailure: () => undefined,
      configure: (connection) => {
        connection.on("UsersChanged", (userId: string, resetPresence: boolean) => {
          if (resetPresence) useUserPresenceStore.getState().setOnline(userId, false);
          void queryClient.invalidateQueries({ queryKey: ["users"] });
        });
        connection.onreconnected(() => {
          void queryClient.invalidateQueries({ queryKey: ["users"] });
        });
        connection.on("UserPresenceChanged", (event: { userId: string; username: string; online: boolean; lastSeenAt: string | null }) => {
          if (event.userId === useAuthStore.getState().user?.id || !event.username) return;
          useUserPresenceStore.getState().setOnline(event.userId, event.online, event.lastSeenAt);
        });
        connection.on("PublicAlbumPublished", (event: Omit<AlbumNotification, "userId" | "readAt">) => {
          const userId = useAuthStore.getState().user?.id;
          if (!userId || userId === event.ownerId) return;
          useAlbumNotificationStore.getState().add(userId, event);
          const message = translate(event.created ? "{username} created public album {album}." : "{username} made album {album} public.", { username: event.username, album: event.albumName });
          void showBrowserNotification(translate("Public album"), message, `/album/${event.albumId}`).catch(() => undefined);
          if (window.location.pathname === "/album") {
            showToast.info(message, { description: translate("Click to refresh."), onClick: () => {
              if (window.location.pathname === "/album") void queryClient.invalidateQueries({ queryKey: ["albums"] });
            } });
          }
        });
        connection.on("UploadCompleted", (event: { batchId: string; ownerId: string; username: string; images: number; videos: number; createdAt: string }) => {
          const userId = useAuthStore.getState().user?.id;
          if (!userId || userId === event.ownerId || !event.username) return;
          useUploadNotificationStore.getState().addRemote(userId, event);
          const message = uploadMessage(translate, event.images, event.videos, event.username);
          void showBrowserNotification(translate("New uploads"), message, "/album").catch(() => undefined);
          const onAlbum = isAlbumPath(window.location.pathname);
          showToast.info(message, {
            description: translate(onAlbum ? "Click to refresh." : "Click to go to album."),
            highlight: [event.username],
            onClick: () => {
              if (isAlbumPath(window.location.pathname)) {
                void queryClient.invalidateQueries({ queryKey: ["media"] });
              } else {
                window.location.assign("/album");
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
          const detail = path === `/album/${event.albumId}`;
          if (detail && event.action === "private" && userId !== event.ownerId) {
            window.location.assign("/");
            return;
          }
          if (event.action === "deleted") refreshAlbumMedia();
          if (path !== "/album" && !detail) return;
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
    window.addEventListener("pointerdown", onUserActivity, { passive: true });
    window.addEventListener("keydown", onUserActivity, { passive: true });

    return () => {
      stopped = true;
      window.removeEventListener("pointerdown", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
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

function isAlbumPath(pathname: string): boolean {
  return pathname === "/album";
}
