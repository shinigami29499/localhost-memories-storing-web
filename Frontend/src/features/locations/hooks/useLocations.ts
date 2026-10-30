import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMedia } from "../../media/hooks/useMedia";
import { locationService } from "../services/locationService";

export function useLocations() {
  const query = useMedia(100, "all", "image");
  const queryClient = useQueryClient();
  const media = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<{ scanned: number; located: number; failedMediaIds: string[] } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError)
      void query.fetchNextPage();
  }, [query.hasNextPage, query.isFetching, query.isFetchNextPageError, query.fetchNextPage]);

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
