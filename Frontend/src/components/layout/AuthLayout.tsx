import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Settings } from "@/components/animate-ui/icons/settings";
import { useLocale } from "../../context/LocaleContext";
import { LanguageToggleButton } from "../ui/LanguageToggleButton";
import { Brand } from "./Brand";
import { CommunityIntro } from "./CommunityIntro";
import "./control-bar.css";

const SettingsPage = lazy(() => import("../../pages/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })));

export function AuthLayout({ children, showSettings = true }: { children: ReactNode; showSettings?: boolean }) {
  const { t } = useLocale();
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (settingsOpen && !settingsDialog.current?.open) settingsDialog.current?.showModal();
  }, [settingsOpen]);

  return (
    <div className="login-shell">
      <header className="login__header">
        <Brand />
        <div className="login__header-actions control-bar">
          <LanguageToggleButton />
          {showSettings ? (
            <button type="button" className="login__settings-button control-bar__action" aria-label={t("Settings")} title={t("Settings")}
              onClick={() => setSettingsOpen(true)}>
              <Settings size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <span className="login__header-note">{t("Your world. Your community.")}</span>
      </header>
      {showSettings ? (
        <dialog ref={settingsDialog} className="login__settings-dialog" aria-label={t("Settings")}
          onClose={() => setSettingsOpen(false)}>
          <button type="button" className="login__settings-close" onClick={() => settingsDialog.current?.close()}>
            {t("Close")}
          </button>
          {settingsOpen ? <Suspense fallback={<p role="status">{t("Loading settings")}</p>}><SettingsPage /></Suspense> : null}
        </dialog>
      ) : null}
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
