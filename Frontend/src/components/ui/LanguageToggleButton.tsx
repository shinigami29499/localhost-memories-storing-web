import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Globe } from "@/components/animate-ui/icons/globe";
import { useLocale } from "../../context/LocaleContext";

export function LanguageToggleButton({ className = "" }: { className?: string }) {
  const { language, toggleLanguage, t } = useLocale();
  const nextLanguage = language === "en" ? "vi" : "en";
  const nextLanguageName = t(nextLanguage === "vi" ? "Vietnamese" : "English");

  return (
    <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
      <button
        type="button"
        className={`language-toggler${className ? ` ${className}` : ""}`}
        aria-label={t("Switch language to {language}", { language: nextLanguageName })}
        title={t("Switch language to {language}", { language: nextLanguageName })}
        onClick={toggleLanguage}
      >
        <Globe size={18} aria-hidden="true" />
        <span className="sr-only">{nextLanguage.toUpperCase()}</span>
      </button>
    </AnimateIcon>
  );
}
