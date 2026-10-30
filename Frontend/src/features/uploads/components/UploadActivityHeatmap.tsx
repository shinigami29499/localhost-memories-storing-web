import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAuthStore } from "../../../store/authStore";
import { uploadService } from "../services/uploadService";
import type { UploadBatch } from "../types";
import "./UploadActivityHeatmap.css";

const MOBILE_QUERY = "(max-width: 640px)";
const MOBILE_WEEKS = 12;
const DESKTOP_WEEKS = 36;
const PAGE_SIZE = 100;

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfHeatmap(today: Date, weeks: number): Date {
  const start = startOfDay(today);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday - (weeks - 1) * 7);
  return start;
}

function makeHeatmapDays(start: Date, today: Date): Date[] {
  const days: Date[] = [];
  const date = new Date(start);
  while (date <= today) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

async function loadRecentBatches(isAdmin: boolean, startDate: Date): Promise<UploadBatch[]> {
  const batches: UploadBatch[] = [];
  let offset = 0;

  while (true) {
    const page = isAdmin
      ? await uploadService.listAll(offset, PAGE_SIZE)
      : await uploadService.list(offset, PAGE_SIZE);
    batches.push(...page.items.filter((batch) => new Date(batch.createdAt) >= startDate));

    const oldestBatch = page.items[page.items.length - 1];
    if (
      page.items.length === 0
      || page.items.length < PAGE_SIZE
      || offset + page.items.length >= page.totalItems
      || (oldestBatch && new Date(oldestBatch.createdAt) < startDate)
    ) {
      return batches;
    }

    offset += page.items.length;
  }
}

export function UploadActivityHeatmap() {
  const { language, t } = useLocale();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const weeks = isMobile ? MOBILE_WEEKS : DESKTOP_WEEKS;
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const isAdmin = user?.role.toLowerCase() === "admin";
  const today = useMemo(() => startOfDay(new Date()), []);
  const startDate = useMemo(() => startOfHeatmap(today, weeks), [today, weeks]);
  const days = useMemo(() => makeHeatmapDays(startDate, today), [startDate, today]);
  const query = useQuery({
    queryKey: ["uploads", "activity", userId, isAdmin, dateKey(startDate)],
    queryFn: () => loadRecentBatches(isAdmin, startDate),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });

  const activity = useMemo(() => {
    const dailyCounts = new Map<string, number>();
    let total = 0;

    for (const batch of query.data ?? []) {
      for (const item of batch.items) {
        if (item.status !== "Success" || !item.completedAt) continue;
        const completedAt = new Date(item.completedAt);
        if (Number.isNaN(completedAt.getTime())) continue;
        const key = dateKey(completedAt);
        if (key < dateKey(startDate) || key > dateKey(today)) continue;
        dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
        total++;
      }
    }

    return { dailyCounts, total };
  }, [query.data, startDate, today]);

  if (!userId) return null;

  if (query.isError) {
    return (
      <section className="upload-activity" aria-label={t("Upload activity heatmap")}>
        <p className="upload-activity__error" role="alert">{t("Could not load upload activity.")}</p>
        <button
          type="button"
          className="upload-activity__retry"
          onClick={() => void query.refetch()}
          aria-label={t("Retry upload activity")}
        >
          {t("Retry")}
        </button>
      </section>
    );
  }

  const formatter = new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section
      className="upload-activity"
      aria-label={t("Upload activity heatmap")}
      aria-busy={query.isPending}
    >
      <div className="upload-activity__header">
        <div className="upload-activity__heading">
          <span className="upload-activity__range">{t("Last {weeks} weeks", { weeks })}</span>
        </div>
        {!query.isPending ? (
          <span className="upload-activity__total" aria-hidden="true">
            {activity.total === 1 ? t("1 file") : t("{count} files", { count: activity.total })}
          </span>
        ) : null}
      </div>
      {query.isPending ? (
        <p className="upload-activity__status" role="status">{t("Loading upload activity…")}</p>
      ) : (
        <>
          <div
            className="upload-activity__grid"
            role="img"
            aria-label={activity.total === 1
              ? t("Upload activity over the last {weeks} weeks: 1 successful file", { weeks })
              : t("Upload activity over the last {weeks} weeks: {count} successful files", {
                weeks,
                count: activity.total,
              })}
          >
            {days.map((day, index) => {
              const count = activity.dailyCounts.get(dateKey(day)) ?? 0;
              const level = count === 0 ? 0 : count === 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
              const countLabel = count === 1
                ? t("1 successful file")
                : t("{count} successful files", { count });
              return (
                <span
                  key={dateKey(day)}
                  className={`upload-activity__day upload-activity__day--${level}`}
                  style={{ gridColumn: Math.floor(index / 7) + 1, gridRow: (index % 7) + 1 }}
                  title={t("{date}: {uploads}", {
                    date: formatter.format(day),
                    uploads: countLabel,
                  })}
                  aria-hidden="true"
                />
              );
            })}
          </div>
          {activity.total === 0 ? (
            <p className="upload-activity__status">
              {t("No completed uploads in the last {weeks} weeks.", { weeks })}
            </p>
          ) : null}
          <div className="upload-activity__legend" aria-hidden="true">
            <span>{t("Less")}</span>
            <span className="upload-activity__day upload-activity__day--0" />
            <span className="upload-activity__day upload-activity__day--1" />
            <span className="upload-activity__day upload-activity__day--2" />
            <span className="upload-activity__day upload-activity__day--3" />
            <span className="upload-activity__day upload-activity__day--4" />
            <span>{t("More")}</span>
          </div>
        </>
      )}
    </section>
  );
}
