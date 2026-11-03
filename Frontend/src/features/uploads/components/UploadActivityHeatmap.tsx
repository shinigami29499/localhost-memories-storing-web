import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActivityHeatmap } from "../../../components/common/ActivityHeatmap";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAuthStore } from "../../../store/authStore";
import { uploadService } from "../services/uploadService";
import type { UploadBatch } from "../types";

import { MOBILE_QUERY, MOBILE_WEEKS, DESKTOP_WEEKS, startOfDay, dateKey, startOfHeatmap, makeHeatmapDays } from "../../../utils/activityHeatmap";

const PAGE_SIZE = 100;

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

export function UploadActivityHeatmap({ compact = false }: { compact?: boolean }) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const weeks = compact || isMobile ? MOBILE_WEEKS : DESKTOP_WEEKS;
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

  return <ActivityHeatmap weeks={weeks} days={days} activity={activity}
    isPending={query.isPending} isError={query.isError} onRetry={() => void query.refetch()} />;
}
