import { useEffect, useState } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { notificationService } from "../services/notificationService";
import type { NotificationFeed, PostNotification } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const notificationQueryKey = (userId: string | undefined) => ["notifications", userId] as const;

export function useNotifications() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const [liveStatus, setLiveStatus] = useState<"connecting" | "connected" | "reconnecting" | "offline">("connecting");
  const query = useQuery({
    queryKey: notificationQueryKey(userId),
    queryFn: () => notificationService.list(),
    enabled: Boolean(accessToken && userId),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!accessToken || !userId) {
      setLiveStatus("offline");
      return;
    }

    let disposed = false;
    let retryTimer: number | undefined;
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/notifications`, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Error)
      .build();

    const handleNotification = (notification: PostNotification) => {
      if (notification.actorId === userId) return;

      queryClient.setQueryData<NotificationFeed>(notificationQueryKey(userId), (current) => {
        if (current?.items.some((item) => item.id === notification.id)) return current;
        return {
          items: [notification, ...(current?.items ?? [])].slice(0, 50),
          unreadCount: (current?.unreadCount ?? 0) + 1,
        };
      });
    };

    connection.on("PostUploaded", handleNotification);
    connection.on("PostActivity", handleNotification);

    connection.onreconnecting(() => setLiveStatus("reconnecting"));
    connection.onreconnected(() => {
      setLiveStatus("connected");
      void queryClient.invalidateQueries({ queryKey: notificationQueryKey(userId) });
    });
    connection.onclose(() => setLiveStatus("offline"));

    const start = async () => {
      try {
        await connection.start();
        if (!disposed) setLiveStatus("connected");
      } catch (error) {
        if (disposed) return;
        console.error("Could not connect to live notifications.", error);
        setLiveStatus("offline");
        retryTimer = window.setTimeout(() => void start(), 5000);
      }
    };

    void start();
    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      connection.off("PostUploaded");
      connection.off("PostActivity");
      void connection.stop().catch((error: unknown) => {
        console.error("Could not stop the notifications connection.", error);
      });
    };
  }, [accessToken, queryClient, userId]);

  return { ...query, liveStatus };
}
