import { HubConnectionBuilder, LogLevel, type HubConnection } from "@microsoft/signalr";

interface NotificationTransportOptions {
  apiBase: string;
  getAccessToken: () => string;
  configure: (connection: HubConnection) => void;
  onFailure: () => void;
}

export function createNotificationTransport({ apiBase, getAccessToken, configure, onFailure }: NotificationTransportOptions) {
  const connection = new HubConnectionBuilder()
    .withUrl(`${apiBase}/hubs/notifications`, { accessTokenFactory: getAccessToken })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Error)
    .build();
  let stopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  const connect = async () => {
    if (stopped) return;
    try {
      await connection.start();
      if (stopped) {
        await connection.stop();
        return;
      }
      await connection.invoke("TrackActivity");
    } catch {
      onFailure();
      if (!stopped && connection.state === "Disconnected") retryTimer = setTimeout(() => void connect(), 5_000);
    }
  };
  configure(connection);
  connection.onclose(() => {
    if (!stopped) retryTimer = setTimeout(() => void connect(), 5_000);
  });
  return {
    start: () => { void connect(); },
    stop: () => {
      stopped = true;
      if (retryTimer !== undefined) clearTimeout(retryTimer);
      void connection.stop();
    },
  };
}
