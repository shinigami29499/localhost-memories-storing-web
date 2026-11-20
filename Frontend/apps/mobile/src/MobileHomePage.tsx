import { useLocale } from "@/context/LocaleContext";

export function HomePage() {
  const { t } = useLocale();
  return <main className="mobile-home" aria-label={t("Home")} />;
}
