import { Switch } from "@animate-ui/react/primitives/base-ui/switch";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { toastManager } from "@/components/ui/Toast";
import { useSettingsState } from "@/pages/settings/useSettingsState";
import "./settings.css";
import { SoundEffectsSettings } from "@/pages/settings/SoundEffectsSettings";

export function SettingsPage() {
  const { t, toastsEnabled, setToastsEnabled, animationsEnabled, setAnimationsEnabled, notificationsEnabled, notificationRequestPending, notificationMessage, locationPermission, locationPending, locationMessage, setLocationMessage, cameraPermission, cameraPending, cameraMessage, setCameraMessage, requestCamera, requestLocation, updateNotifications } = useSettingsState();

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
                <AnimateUIProvider reducedMotion="user"><Switch.Thumb className="settings-page__switch-thumb" /></AnimateUIProvider>
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
                <AnimateUIProvider reducedMotion="user"><Switch.Thumb className="settings-page__switch-thumb" /></AnimateUIProvider>
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
              <AnimateUIProvider reducedMotion="user"><Switch.Thumb className="settings-page__switch-thumb" /></AnimateUIProvider>
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
              <AnimateUIProvider reducedMotion="user"><Switch.Thumb className="settings-page__switch-thumb" /></AnimateUIProvider>
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
              <AnimateUIProvider reducedMotion="user"><Switch.Thumb className="settings-page__switch-thumb" /></AnimateUIProvider>
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
