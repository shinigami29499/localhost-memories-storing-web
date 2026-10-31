import type { ReactNode } from "react";
import { useLocale } from "../../context/LocaleContext";
import { LanguageToggleButton } from "../ui/LanguageToggleButton";
import { ThemeTogglerButton } from "../ui/ThemeTogglerButton";
import { Brand } from "./Brand";
import { CommunityIntro } from "./CommunityIntro";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useLocale();

  return (
    <div className="login-shell">
      <header className="login__header">
        <Brand />
        <div className="login__header-actions">
          <LanguageToggleButton />
          <ThemeTogglerButton />
        </div>
        <span className="login__header-note">{t("Your world. Your community.")}</span>
      </header>
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
