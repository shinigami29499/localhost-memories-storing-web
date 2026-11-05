import { useEffect, useState } from "react";
import { Switch } from "@animate-ui/react/primitives/base-ui/switch";
import { useAnimationStore } from "../../store/animationStore";
import { useToastPreferencesStore } from "../../store/toastPreferencesStore";
import { toastManager } from "../../components/ui/Toast";
import { useLocale } from "../../context/LocaleContext";
import { showToast } from "../../components/ui/Toast";
import {
  areBrowserNotificationsEnabled,
  requestBrowserNotificationPermission,
  setBrowserNotificationsEnabled,
} from "../../features/notifications/browserNotifications";
import "./settings.css";
import { SoundEffectsSettings } from "./SoundEffectsSettings";

export function SettingsPage() {
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

  return (
    <main className="settings-page">
      <div className="settings-page__inner">

        <section className="settings-page__section" aria-labelledby="settings-preferences-title">
          <h2 id="settings-preferences-title">{t("Preferences")}</h2>
          <div className="settings-page__fields">
            <SoundEffectsSettings />
            <div className="settings-page__field">
              <div className="settings-page__field-copy">
                <label htmlFor="settings-toasts">{t("Toast notifications")}</label>
                <p id="settings-toasts-help">{t("Show temporary notifications throughout the app.")}</p>
              </div>
              <Switch.Root id="settings-toasts" className="settings-page__switch"
                checked={toastsEnabled} onCheckedChange={(enabled) => {
                  setToastsEnabled(enabled);
                  if (!enabled) toastManager.close();
                }} aria-describedby="settings-toasts-help">
                <Switch.Thumb className="settings-page__switch-thumb" />
              </Switch.Root>
            </div>
            <div className="settings-page__field">
              <div className="settings-page__field-copy">
                <label htmlFor="settings-animations">{t("Interface motion")}</label>
                <p id="settings-animations-help">{t("Use subtle motion for dialogs and feedback. Off removes optional motion.")}</p>
              </div>
              <Switch.Root id="settings-animations" className="settings-page__switch"
                checked={animationsEnabled} onCheckedChange={setAnimationsEnabled}
                aria-describedby="settings-animations-help">
                <Switch.Thumb className="settings-page__switch-thumb" />
              </Switch.Root>
            </div>
          </div>
        </section>

        <section className="settings-page__mobile-notifications" aria-labelledby="settings-location-title">
          <h2 id="settings-location-title">{t("Location")}</h2>
          <div className="settings-page__notification">
            <div className="settings-page__notification-copy">
              <label htmlFor="settings-location">{t("Enable location")}</label>
              <p id="settings-location-help" role="status">{locationMessage || (locationPermission === "granted"
                ? t("Location access is enabled.")
                : locationPermission === "denied"
                  ? t("Allow location access in your browser or device settings.")
                  : t("Allow the app to request your current location."))}</p>
            </div>
            <Switch.Root id="settings-location" className="settings-page__switch"
              checked={locationPermission === "granted"} disabled={locationPending}
              onCheckedChange={(checked) => {
                if (!checked) setLocationMessage(t("Turn off location access in your browser or device settings."));
                else if (locationPermission === "denied") setLocationMessage(t("Allow location access in your browser or device settings."));
                else requestLocation();
              }}
              aria-describedby="settings-location-help">
              <Switch.Thumb className="settings-page__switch-thumb" />
            </Switch.Root>
          </div>
        </section>

        <section className="settings-page__mobile-notifications" aria-labelledby="settings-camera-title">
          <h2 id="settings-camera-title">{t("Camera")}</h2>
          <div className="settings-page__notification">
            <div className="settings-page__notification-copy">
              <label htmlFor="settings-camera">{t("Enable camera")}</label>
              <p id="settings-camera-help" role="status">{cameraMessage || (cameraPermission === "granted"
                ? t("Camera access is enabled.") : t("Camera access is requested when you take a photo."))}</p>
            </div>
            <Switch.Root id="settings-camera" className="settings-page__switch"
              checked={cameraPermission === "granted"} disabled={cameraPending}
              onCheckedChange={(checked) => {
                if (checked) void requestCamera();
                else setCameraMessage(t("Turn off camera access in your browser or device settings."));
              }} aria-describedby="settings-camera-help">
              <Switch.Thumb className="settings-page__switch-thumb" />
            </Switch.Root>
          </div>
        </section>

        <section className="settings-page__mobile-notifications" aria-labelledby="settings-photos-title">
          <h2 id="settings-photos-title">{t("Photo library")}</h2>
          <p className="settings-page__notification-note">{t("Choose photos using your device's photo picker. Photo access is managed by your device and cannot be checked here.")}</p>
        </section>

        <section
          className="settings-page__mobile-notifications"
          aria-labelledby="settings-notifications-title"
        >
          <h2 id="settings-notifications-title">{t("Notifications")}</h2>
          <div className="settings-page__notification">
            <div className="settings-page__notification-copy">
              <label htmlFor="settings-notifications-enabled">{t("Enable notifications")}</label>
              <p id="settings-notifications-help" role="status">
                {notificationMessage || t("You can enable or disable notifications at any time.")}
              </p>
            </div>
            <Switch.Root id="settings-notifications-enabled" className="settings-page__switch"
              checked={notificationsEnabled} disabled={notificationRequestPending}
              onCheckedChange={(checked) => void updateNotifications(checked)}
              aria-describedby="settings-notifications-help">
              <Switch.Thumb className="settings-page__switch-thumb" />
            </Switch.Root>
          </div>
          <p className="settings-page__notification-note">
            {t("Upload alerts appear when the app is in the background. Push notifications after closing the app are not available yet.")}
          </p>
        </section>
      </div>
    </main>
  );
}
