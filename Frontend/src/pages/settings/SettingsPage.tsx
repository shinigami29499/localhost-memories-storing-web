import { useEffect, useState } from "react";
import { Switch } from "@animate-ui/react/primitives/base-ui/switch";
import { useAnimationStore } from "../../store/animationStore";
import { useToastPreferencesStore } from "../../store/toastPreferencesStore";
import { toastManager } from "../../components/ui/Toast";
import { Select } from "@animate-ui/react/primitives/base-ui/select";
import { ChevronDown } from "../../components/animate-ui/icons/chevron-down";
import { useLocale } from "../../context/LocaleContext";
import { showToast } from "../../components/ui/Toast";
import {
  CLICK_ANIMATION_EFFECTS,
  isClickAnimationEffect,
  useClickAnimationStore,
  type ClickAnimationEffect,
} from "../../store/clickAnimationStore";
import {
  areBrowserNotificationsEnabled,
  requestBrowserNotificationPermission,
  setBrowserNotificationsEnabled,
} from "../../features/notifications/browserNotifications";
import {
  PAGE_TRANSITION_EFFECTS,
  isPageTransitionEffect,
  readPageTransitionEffect,
  writePageTransitionEffect,
  type PageTransitionEffect,
} from "../../utils/pageTransition";
import "./settings.css";

const transitionLabels: Record<PageTransitionEffect, string> = {
  fade: "Fade",
  slide: "Slide",
  push: "Push",
  iris: "Iris",
  wipe: "Wipe",
  bands: "Bands",
  stack: "Stack",
  flow: "Flow",
  chop: "Chop",
  random: "Random",
};

const clickAnimationLabels: Record<ClickAnimationEffect, string> = {
  off: "Off",
  ring: "Ring",
  ripple: "Ripple",
  crosshair: "Crosshair",
  burst: "Burst",
  particles: "Particles",
};

export function SettingsPage() {
  const { t } = useLocale();
  const toastsEnabled = useToastPreferencesStore((state) => state.enabled);
  const setToastsEnabled = useToastPreferencesStore((state) => state.setEnabled);
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const setAnimationsEnabled = useAnimationStore((state) => state.setEnabled);
  const iconsEnabled = useAnimationStore((state) => state.iconsEnabled);
  const setIconsEnabled = useAnimationStore((state) => state.setIconsEnabled);
  const clickAnimation = useClickAnimationStore((state) => state.effect);
  const setClickAnimation = useClickAnimationStore((state) => state.setEffect);
  const [pageTransition, setPageTransition] = useState(readPageTransitionEffect);
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
        } else {
          setLocationMessage(t("Could not determine your current location. Check location permission and try again."));
        }
        setLocationPending(false);
      },
      { timeout: 10000, maximumAge: 0 },
    );
  };

  const updatePageTransition = (value: string | null) => {
    if (value === null || !isPageTransitionEffect(value)) return;
    const nextEffect = value;
    writePageTransitionEffect(nextEffect);
    setPageTransition(nextEffect);
  };

  const updateClickAnimation = (value: string | null) => {
    if (value === null) return;
    try {
      if (!isClickAnimationEffect(value)) {
        throw new Error("Invalid click animation option.");
      }
      setClickAnimation(value);
    } catch (error) {
      console.error("Could not save click animation preference.", error);
      showToast.error(t("Could not save click animation. Please try again."));
    }
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
        <header className="settings-page__header">
          <h1>{t("Settings")}<span className="brand__dot">.</span></h1>
          <p>{t("Manage app preferences.")}</p>
        </header>

        <section className="settings-page__section" aria-labelledby="settings-preferences-title">
          <h2 id="settings-preferences-title">{t("Preferences")}</h2>
          <div className="settings-page__fields">
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
                <label htmlFor="settings-icon-animations">{t("Icon animations")}</label>
                <p id="settings-icon-animations-help">{t("Enable animated icons throughout the app.")}</p>
              </div>
              <Switch.Root id="settings-icon-animations" className="settings-page__switch"
                checked={iconsEnabled} onCheckedChange={setIconsEnabled}
                aria-describedby="settings-icon-animations-help">
                <Switch.Thumb className="settings-page__switch-thumb" />
              </Switch.Root>
            </div>
            <div className="settings-page__field">
              <div className="settings-page__field-copy">
                <label htmlFor="settings-animations">{t("Page and click animations")}</label>
                <p id="settings-animations-help">{t("Enable effects for page changes and clicks.")}</p>
                <p id="settings-animations-note" className="settings-page__animation-note">{t("When off, page changes use a fade.")}</p>
              </div>
              <Switch.Root id="settings-animations" className="settings-page__switch"
                checked={animationsEnabled} onCheckedChange={setAnimationsEnabled}
                aria-describedby="settings-animations-help settings-animations-note">
                <Switch.Thumb className="settings-page__switch-thumb" />
              </Switch.Root>
            </div>
            <div className="settings-page__field">
              <div className="settings-page__field-copy">
                <label htmlFor="settings-page-transition">{t("Page transition")}</label>
                <p id="settings-page-transition-help">{t("Choose an effect for page changes.")}</p>
              </div>
              <Select.Root value={pageTransition} onValueChange={updatePageTransition} disabled={!animationsEnabled}>
                <Select.Trigger
                  id="settings-page-transition"
                  className="settings-page__transition-trigger"
                  aria-describedby="settings-page-transition-help"
                >
                  <Select.Value>{t(transitionLabels[pageTransition])}</Select.Value>
                  <ChevronDown size={16} className="settings-page__transition-icon" aria-hidden="true" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner
                    className="settings-page__transition-positioner"
                    alignItemWithTrigger={false}
                    sideOffset={4}
                  >
                    <Select.Popup className="settings-page__transition-popup">
                      <Select.List className="settings-page__transition-list">
                        {PAGE_TRANSITION_EFFECTS.map((effect) => (
                          <Select.Item key={effect} value={effect} className="settings-page__transition-item">
                            <Select.ItemText>{t(transitionLabels[effect])}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </div>
            <div className="settings-page__field">
              <div className="settings-page__field-copy">
                <label htmlFor="settings-click-animation">{t("Click animation")}</label>
                <p id="settings-click-animation-help">
                  {t("Choose an effect for clicks throughout the app.")}
                  {" "}
                  {t("Effects are disabled when you prefer reduced motion.")}
                </p>
              </div>
              <Select.Root value={clickAnimation} onValueChange={updateClickAnimation} disabled={!animationsEnabled}>
                <Select.Trigger
                  id="settings-click-animation"
                  className="settings-page__transition-trigger"
                  aria-describedby="settings-click-animation-help"
                >
                  <Select.Value>{t(clickAnimationLabels[clickAnimation])}</Select.Value>
                  <ChevronDown size={16} className="settings-page__transition-icon" aria-hidden="true" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner
                    className="settings-page__transition-positioner"
                    alignItemWithTrigger={false}
                    sideOffset={4}
                  >
                    <Select.Popup className="settings-page__transition-popup">
                      <Select.List className="settings-page__transition-list">
                        {CLICK_ANIMATION_EFFECTS.map((effect) => (
                          <Select.Item key={effect} value={effect} className="settings-page__transition-item">
                            <Select.ItemText>{t(clickAnimationLabels[effect])}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
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
