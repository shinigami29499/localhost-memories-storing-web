import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActivityHeatmap } from "../../../components/common/ActivityHeatmap";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAuthStore } from "../../../store/authStore";
import { listAllDownloadHistory } from "../services/downloadHistory";

import { MOBILE_QUERY, MOBILE_WEEKS, DESKTOP_WEEKS, startOfDay, dateKey, startOfHeatmap, makeHeatmapDays } from "../../../utils/activityHeatmap";

export function DownloadActivityHeatmap() {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const weeks = isMobile ? MOBILE_WEEKS : DESKTOP_WEEKS;
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const today = useMemo(() => startOfDay(new Date()), []);
  const startDate = useMemo(() => startOfHeatmap(today, weeks), [today, weeks]);
  const days = useMemo(() => makeHeatmapDays(startDate, today), [startDate, today]);
  const query = useQuery({
    queryKey: ["downloads", "activity", userId],
    queryFn: listAllDownloadHistory,
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });

  const activity = useMemo(() => {
    const dailyCounts = new Map<string, number>();
    let total = 0;

    for (const record of query.data ?? []) {
      const completedAt = new Date(record.createdAt);
      if (Number.isNaN(completedAt.getTime())) continue;
      const key = dateKey(completedAt);
      if (key < dateKey(startDate) || key > dateKey(today)) continue;
      dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
      total++;
    }

    return { dailyCounts, total };
  }, [query.data, startDate, today]);

  if (!userId) return null;

  return <ActivityHeatmap kind="download" weeks={weeks} days={days} activity={activity}
    isPending={query.isPending} isError={query.isError} onRetry={() => void query.refetch()} />;
}
