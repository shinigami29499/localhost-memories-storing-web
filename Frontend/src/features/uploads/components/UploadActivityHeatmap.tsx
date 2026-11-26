import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAuthStore } from "../../../store/authStore";
import { useUploadProgress } from "../uploadProgress";
import { MOBILE_QUERY, MOBILE_WEEKS, DESKTOP_WEEKS, startOfDay, dateKey, startOfHeatmap, makeHeatmapDays } from "../utils/activityHeatmap";

export function UploadActivityHeatmap({ compact = false }: { compact?: boolean }) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const weeks = compact ? 8 : isMobile ? MOBILE_WEEKS : DESKTOP_WEEKS;
  const userId = useAuthStore((state) => state.user?.id);
  const dates = useUploadProgress(useShallow(({ transfers }) => Object.values(transfers)
    .filter((transfer) => transfer.userId === userId && transfer.status === "success")
    .map((transfer) => transfer.completedAt)));
  const today = useMemo(() => startOfDay(new Date()), []);
  const startDate = useMemo(() => startOfHeatmap(today, weeks), [today, weeks]);
  const days = useMemo(() => makeHeatmapDays(startDate, today), [startDate, today]);

  const activity = useMemo(() => {
    const dailyCounts = new Map<string, number>();
    let total = 0;
    for (const value of dates) {
      if (!value) continue;
      const key = dateKey(new Date(value));
      if (key < dateKey(startDate) || key > dateKey(today)) continue;
      dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
      total++;
    }
    return { dailyCounts, total };
  }, [dates, startDate, today]);

  if (!userId) return null;
  return <ActivityHeatmap weeks={weeks} days={days} activity={activity} />;
}
