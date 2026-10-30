import { useLocale } from "../../context/LocaleContext";
import { UploadActivityHeatmap } from "../../features/uploads/components/UploadActivityHeatmap";

export function UploadActivityPage() {
  const { t } = useLocale();

  return (
    <main className="upload-activity-page" aria-labelledby="upload-activity-title">
      <header className="upload-activity-page__header">
        <h1 id="upload-activity-title">{t("Upload activity")}</h1>
        <p>{t("The heatmap shows 36 weeks on desktop and 12 weeks on mobile.")}</p>
      </header>
      <UploadActivityHeatmap />
    </main>
  );
}
