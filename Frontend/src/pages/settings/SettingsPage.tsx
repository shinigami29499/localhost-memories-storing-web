import { useState } from "react";
import { Select } from "@animate-ui/react/primitives/base-ui/select";
import { ChevronDown } from "../../components/animate-ui/icons/chevron-down";
import { useLocale } from "../../context/LocaleContext";
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
  zoom: "Zoom",
  iris: "Iris",
  wipe: "Wipe",
  bands: "Bands",
  stack: "Stack",
  flow: "Flow",
  chop: "Chop",
  random: "Random",
};

export function SettingsPage() {
  const { t } = useLocale();
  const [pageTransition, setPageTransition] = useState(readPageTransitionEffect);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => areBrowserNotificationsEnabled()
      && "Notification" in window
      && Notification.permission === "granted",
  );
  const [notificationRequestPending, setNotificationRequestPending] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  const updatePageTransition = (value: string) => {
    if (!isPageTransitionEffect(value)) return;
    const nextEffect = value;
    writePageTransitionEffect(nextEffect);
    setPageTransition(nextEffect);
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
                <label htmlFor="settings-page-transition">{t("Page transition")}</label>
                <p id="settings-page-transition-help">{t("Choose an effect for page changes.")}</p>
              </div>
              <Select.Root value={pageTransition} onValueChange={updatePageTransition}>
                <Select.Trigger
                  id="settings-page-transition"
                  className="settings-page__transition-trigger"
                  aria-describedby="settings-page-transition-help"
                >
                  <Select.Value>{t(transitionLabels[pageTransition])}</Select.Value>
                  <Select.Icon asChild>
                    <ChevronDown size={16} className="settings-page__transition-icon" aria-hidden="true" />
                  </Select.Icon>
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
          </div>
        </section>

        <section
          className="settings-page__mobile-notifications"
          aria-labelledby="settings-notifications-title"
        >
          <h2 id="settings-notifications-title">{t("Notifications")}</h2>
          <div className="settings-page__notification">
            <input
              id="settings-notifications-enabled"
              type="checkbox"
              checked={notificationsEnabled}
              disabled={notificationRequestPending}
              onChange={(event) => void updateNotifications(event.currentTarget.checked)}
            />
            <div className="settings-page__notification-copy">
              <label htmlFor="settings-notifications-enabled">{t("Enable notifications")}</label>
              <p role="status">
                {notificationMessage || t("You can enable or disable notifications at any time.")}
              </p>
            </div>
          </div>
          <p className="settings-page__notification-note">
            {t("Upload alerts appear when the app is in the background. Push notifications after closing the app are not available yet.")}
          </p>
        </section>
      </div>
    </main>
  );
}
