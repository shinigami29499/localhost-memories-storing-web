import { useEffect, useState } from "react";
import { useAnimationStore } from "../../store/animationStore";
import { useToastPreferencesStore } from "../../store/toastPreferencesStore";
import { useLocale } from "../../context/LocaleContext";
import { showToast } from "../../components/ui/Toast";
import { areBrowserNotificationsEnabled, requestBrowserNotificationPermission, setBrowserNotificationsEnabled } from "../../features/notifications/browserNotifications";

export function useSettingsState() {
  const { t } = useLocale();
  const toastsEnabled = useToastPreferencesStore((state) => state.enabled);
  const setToastsEnabled = useToastPreferencesStore((state) => state.setEnabled);
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const setAnimationsEnabled = useAnimationStore((state) => state.setEnabled);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => areBrowserNotificationsEnabled()
      && "Notification" in window
      && Notification.permission === "granted",
  );
  const [notificationRequestPending, setNotificationRequestPending] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [locationPermission, setLocationPermission] = useState<PermissionState | "unknown">("unknown");
  const [locationPending, setLocationPending] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [cameraPermission, setCameraPermission] = useState<PermissionState | "unknown">("unknown");
  const [cameraPending, setCameraPending] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");

  useEffect(() => {
    let permission: PermissionStatus | undefined;
    let cancelled = false;
    const update = () => { if (permission && !cancelled) setCameraPermission(permission.state); };
    const refresh = () => {
      if (!navigator.permissions?.query) return;
      void navigator.permissions.query({ name: "camera" as PermissionName }).then((result) => {
        if (cancelled) return;
        permission?.removeEventListener("change", update);
        permission = result;
        update();
        permission.addEventListener("change", update);
      }).catch(() => {});
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      permission?.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const requestCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage(t("Camera access is unavailable. Use HTTPS and a supported browser."));
      return;
    }
    setCameraPending(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setCameraPermission("granted");
      setCameraMessage("");
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      const message = t(denied ? "Camera access failed. Allow camera access in your browser or device settings." : "Camera access is unavailable. Use HTTPS and a supported browser.");
      if (denied) setCameraPermission("denied");
      setCameraMessage(message);
      showToast.error(message);
    } finally {
      setCameraPending(false);
    }
  };

  useEffect(() => {
    let permission: PermissionStatus | undefined;
    let cancelled = false;
    const update = () => {
      if (permission && !cancelled) {
        setLocationPermission(permission.state);
        setLocationMessage("");
      }
    };
    if (navigator.permissions?.query) {
      void navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (cancelled) return;
        permission = result;
        update();
        permission.addEventListener("change", update);
      }).catch(() => {});
    }
    return () => {
      cancelled = true;
      permission?.removeEventListener("change", update);
    };
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage(t("Location is not available on this device."));
      return;
    }
    setLocationPending(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationPermission("granted");
        setLocationMessage(t("Location access is enabled."));
        setLocationPending(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermission("denied");
          setLocationMessage(t("Allow location access in your browser or device settings."));
          showToast.error(t("Location access failed. Allow location access in your browser or device settings."));
        } else {
          setLocationMessage(t("Could not determine your current location. Check location permission and try again."));
        }
        setLocationPending(false);
      },
      { timeout: 10000, maximumAge: 0 },
    );
  };

  const updateNotifications = async (enabled: boolean) => {
    setNotificationRequestPending(true);
    try {
      if (!enabled) {
        setBrowserNotificationsEnabled(false);
        setNotificationsEnabled(false);
        setNotificationMessage(t("You can enable or disable notifications at any time."));
        return;
      }

      const permission = await requestBrowserNotificationPermission();
      if (permission === "unsupported") {
        setBrowserNotificationsEnabled(false);
        setNotificationsEnabled(false);
        setNotificationMessage(t("Notifications are not supported by this browser."));
        return;
      }

      const granted = permission === "granted";
      setBrowserNotificationsEnabled(granted);
      setNotificationsEnabled(granted);
      if (!granted) showToast.error(t("Notifications failed. Allow notifications in your browser or device settings."));
      setNotificationMessage(granted
        ? t("You can enable or disable notifications at any time.")
        : t("Allow notifications in your browser settings to enable them."));
    } catch (error) {
      console.error("Could not update notification permission.", error);
      setBrowserNotificationsEnabled(false);
      setNotificationsEnabled(false);
      setNotificationMessage(t("Could not enable notifications. Check browser settings and try again."));
    } finally {
      setNotificationRequestPending(false);
    }
  };

  return { t, toastsEnabled, setToastsEnabled, animationsEnabled, setAnimationsEnabled, notificationsEnabled, notificationRequestPending, notificationMessage, locationPermission, locationPending, locationMessage, setLocationMessage, cameraPermission, cameraPending, cameraMessage, setCameraMessage, requestCamera, requestLocation, updateNotifications };
}

