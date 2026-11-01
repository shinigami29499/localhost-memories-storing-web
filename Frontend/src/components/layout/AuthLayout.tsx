import { useRef, type ReactNode } from "react";
import { Settings } from "@/components/animate-ui/icons/settings";
import { SettingsPage } from "../../pages/settings/SettingsPage";
import { useLocale } from "../../context/LocaleContext";
import { LanguageToggleButton } from "../ui/LanguageToggleButton";
import { ThemeTogglerButton } from "../ui/ThemeTogglerButton";
import { Brand } from "./Brand";
import { CommunityIntro } from "./CommunityIntro";
import "./control-bar.css";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const settingsDialog = useRef<HTMLDialogElement>(null);

  return (
    <div className="login-shell">
      <header className="login__header">
        <Brand />
        <div className="login__header-actions control-bar">
          <ThemeTogglerButton />
          <LanguageToggleButton />
          <button type="button" className="login__settings-button control-bar__action" aria-label={t("Settings")} title={t("Settings")}
            onClick={() => settingsDialog.current?.showModal()}>
            <Settings size={18} aria-hidden="true" />
          </button>
        </div>
        <span className="login__header-note">{t("Your world. Your community.")}</span>
      </header>
      <dialog ref={settingsDialog} className="login__settings-dialog" aria-label={t("Settings")}>
        <button type="button" className="login__settings-close" onClick={() => settingsDialog.current?.close()}>
          {t("Close")}
        </button>
        <SettingsPage />
      </dialog>
      <main className="login">
        <CommunityIntro variant="login" />
        {children}
      </main>
      <footer className="login__footer">
        <span>ShinigaCim</span>
        <span>{t("Made for moments worth sharing.")}</span>
      </footer>
    </div>
  );
}
