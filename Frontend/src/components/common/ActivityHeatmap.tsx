import { useLocale } from "../../context/LocaleContext";
import { Link } from "react-router-dom";
import { dateKey } from "../../utils/activityHeatmap";
import "../../features/uploads/components/UploadActivityHeatmap.css";

interface Props {
  weeks: number;
  days: Date[];
  activity: { dailyCounts: Map<string, number>; total: number };
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function ActivityHeatmap({ weeks, days, activity, isPending, isError, onRetry }: Props) {
  const { language, t } = useLocale();
  const label = t("Upload activity heatmap");

  if (isError) {
    return (
      <section className="upload-activity" aria-label={label}>
        <p className="upload-activity__error" role="alert">{t("Could not load upload activity.")}</p>
        <button type="button" className="upload-activity__retry" onClick={onRetry} aria-label={t("Retry upload activity")}>
          {t("Retry")}
        </button>
      </section>
    );
  }

  const formatter = new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const summary = activity.total === 1
    ? t("Upload activity over the last {weeks} weeks: 1 successful file", { weeks })
    : t("Upload activity over the last {weeks} weeks: {count} successful files", { weeks, count: activity.total });

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
        <p className="upload-activity__status" role="status">{t("Loading upload activity...")}</p>
      ) : (
        <>
          <div className="upload-activity__grid" role="group" aria-label={summary}>
            {days.map((day, index) => {
              const key = dateKey(day);
              const count = activity.dailyCounts.get(key) ?? 0;
              const level = count === 0 ? 0 : count === 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : count <= 19 ? 4 : 5;
              const countLabel = count === 1
                ? t("1 successful file")
                : t("{count} successful files", { count });
              const dayLabel = t("{date}: {uploads}", { date: formatter.format(day), uploads: countLabel });
              return <Link key={key} to={`/uploads?date=${key}`} className={`upload-activity__day upload-activity__day--${level}`}
                style={{ gridColumn: Math.floor(index / 7) + 1, gridRow: (index % 7) + 1 }}
                title={dayLabel} aria-label={dayLabel} />;
            })}
          </div>
          {activity.total === 0 && <p className="upload-activity__status">
            {t("No completed uploads in the last {weeks} weeks.", { weeks })}
          </p>}
          <div className="upload-activity__legend" aria-hidden="true">
            <span>{t("Less")}</span>
            {[0, 1, 2, 3, 4, 5].map((level) => <span key={level} className={`upload-activity__day upload-activity__day--${level}`} />)}
            <span>{t("More")}</span>
          </div>
        </>
      )}
    </section>
  );
}
