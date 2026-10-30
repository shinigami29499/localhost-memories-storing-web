const enabledStorageKey = "shinigacim.notifications.enabled";

export function areBrowserNotificationsEnabled(): boolean {
  return window.localStorage.getItem(enabledStorageKey) === "true";
}

export function setBrowserNotificationsEnabled(enabled: boolean): void {
  window.localStorage.setItem(enabledStorageKey, String(enabled));
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!("Notification" in window)) return "unsupported";
  return Notification.requestPermission();
}

export async function showBrowserNotification(title: string, body: string): Promise<void> {
  if (
    !areBrowserNotificationsEnabled()
    || !("Notification" in window)
    || Notification.permission !== "granted"
    || document.visibilityState === "visible"
  ) return;

  const options = { body, icon: "/pwa-icon-192.png" };
  const registration = "serviceWorker" in navigator
    ? await navigator.serviceWorker.getRegistration()
    : undefined;

  if (registration) {
    await registration.showNotification(title, options);
    return;
  }

  const notification = new Notification(title, options);
  notification.onclick = () => {
    window.focus();
    window.location.assign("/sync/upload");
    notification.close();
  };
}
