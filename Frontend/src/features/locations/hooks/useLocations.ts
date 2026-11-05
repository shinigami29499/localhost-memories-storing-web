import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { mediaService } from "../../media/services/mediaService";
import { locationService } from "../services/locationService";
import type { MapBounds } from "../types";

const world: MapBounds = { west: -180, south: -90, east: 180, north: 90 };

export function useLocations(enabled = true, requestedMediaIds: string[] = [], bounds: MapBounds = world) {
  const query = useInfiniteQuery({
    queryKey: ["media", "map", bounds],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => locationService.mapPage(pageParam, bounds, signal),
    getNextPageParam: (page) => page.items.length > 0 && page.offset + page.items.length < page.total
      ? page.offset + page.items.length : undefined,
    placeholderData: (previous) => previous,
    enabled,
  });
  const queryClient = useQueryClient();
  const requestedIds = [...new Set(requestedMediaIds.filter(Boolean))];
  const requested = useQueries({ queries: requestedIds.map((id) => ({
    queryKey: ["media", "detail", id], queryFn: () => mediaService.get(id), retry: false, enabled,
  })) });
  const media = useMemo(() => {
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];
    const seen = new Set(items.map((item) => item.id));
    for (const result of requested) {
      if (result.data && !seen.has(result.data.id)) {
        items.push(result.data);
        seen.add(result.data.id);
      }
    }
    return items;
  }, [query.data, requested.map((result) => `${result.data?.id ?? ""}:${result.dataUpdatedAt}`).join(",")]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<{ scanned: number; located: number; failedMediaIds: string[] } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanController = useRef<AbortController | null>(null);

  useEffect(() => () => scanController.current?.abort(), []);

  const scan = async () => {
    if (scanController.current) return;
    const controller = new AbortController();
    scanController.current = controller;
    setScanning(true);
    setScanProgress(0);
    setScanResult(null);
    setScanError(null);
    const result = { scanned: 0, located: 0, failedMediaIds: [] as string[] };
    try {
      let offset = 0;
      let hasMore = true;
      while (hasMore && !controller.signal.aborted) {
        const batch = await locationService.scan(offset, controller.signal);
        result.scanned += batch.scanned;
        result.located += batch.located;
        result.failedMediaIds.push(...batch.failedMediaIds);
        offset = batch.nextOffset;
        hasMore = batch.hasMore;
        setScanProgress(result.scanned);
      }
      if (!controller.signal.aborted) setScanResult(result);
    } catch (error) {
      if (!controller.signal.aborted)
        setScanError(error instanceof Error ? error.message : "Could not scan photo locations.");
    } finally {
      scanController.current = null;
      if (!controller.signal.aborted) setScanning(false);
      await queryClient.invalidateQueries({ queryKey: ["media"] });
    }
  };

  return { query, media, scan, scanning, scanProgress, scanResult, scanError };
}
