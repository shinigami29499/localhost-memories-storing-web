import { useLocale } from "../../context/LocaleContext";
import { dateKey } from "../../utils/activityHeatmap";
import "../../features/uploads/components/UploadActivityHeatmap.css";

interface Props {
  kind: "upload" | "download";
  weeks: number;
  days: Date[];
  activity: { dailyCounts: Map<string, number>; total: number };
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function ActivityHeatmap({ kind, weeks, days, activity, isPending, isError, onRetry }: Props) {
  const { language, t } = useLocale();
  const upload = kind === "upload";
  const label = t(upload ? "Upload activity heatmap" : "Download activity heatmap");

  if (isError) {
    return (
      <section className="upload-activity" aria-label={label}>
        <p className="upload-activity__error" role="alert">{t(upload ? "Could not load upload activity." : "Could not load download activity.")}</p>
        <button type="button" className="upload-activity__retry" onClick={onRetry} aria-label={t(upload ? "Retry upload activity" : "Retry download activity")}>
          {t("Retry")}
        </button>
      </section>
    );
  }

  const formatter = new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const summary = activity.total === 1
    ? t(upload ? "Upload activity over the last {weeks} weeks: 1 successful file" : "Download activity over the last {weeks} weeks: 1 downloaded file", { weeks })
    : t(upload ? "Upload activity over the last {weeks} weeks: {count} successful files" : "Download activity over the last {weeks} weeks: {count} downloaded files", { weeks, count: activity.total });

  return (
    <section className="upload-activity" aria-label={label} aria-busy={isPending}>
      <div className="upload-activity__header">
        <div className="upload-activity__heading">
          <span className="upload-activity__range">{t("Last {weeks} weeks", { weeks })}</span>
        </div>
        {!isPending && <span className="upload-activity__total" aria-hidden="true">
          {activity.total === 1 ? t("1 file") : t("{count} files", { count: activity.total })}
        </span>}
      </div>
      {isPending ? (
        <p className="upload-activity__status" role="status">{t(upload ? "Loading upload activity…" : "Loading download activity…")}</p>
      ) : (
        <>
          <div className="upload-activity__grid" role="img" aria-label={summary}>
            {days.map((day, index) => {
              const key = dateKey(day);
              const count = activity.dailyCounts.get(key) ?? 0;
              const level = count === 0 ? 0 : count === 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
              const countLabel = count === 1
                ? t(upload ? "1 successful file" : "1 downloaded file")
                : t(upload ? "{count} successful files" : "{count} downloaded files", { count });
              return <span key={key} className={`upload-activity__day upload-activity__day--${level}`}
                style={{ gridColumn: Math.floor(index / 7) + 1, gridRow: (index % 7) + 1 }}
                title={t("{date}: {uploads}", { date: formatter.format(day), uploads: countLabel })} aria-hidden="true" />;
            })}
          </div>
          {activity.total === 0 && <p className="upload-activity__status">
            {t(upload ? "No completed uploads in the last {weeks} weeks." : "No downloads in the last {weeks} weeks.", { weeks })}
          </p>}
          <div className="upload-activity__legend" aria-hidden="true">
            <span>{t("Less")}</span>
            {[0, 1, 2, 3, 4].map((level) => <span key={level} className={`upload-activity__day upload-activity__day--${level}`} />)}
            <span>{t("More")}</span>
          </div>
        </>
      )}
    </section>
  );
}
