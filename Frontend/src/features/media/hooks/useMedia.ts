import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { mediaService } from "../services/mediaService";
import type { MediaKindFilter, PagedMedia } from "../types";

export type MediaSource = "all" | "favorites";

export function mediaQueryOptions(
  limit = 20, source: MediaSource = "all", mediaKind?: MediaKindFilter, retainForSession = false, enabled = true,
) {
  return infiniteQueryOptions({
    queryKey: ["media", source, mediaKind ?? "all", limit],
    initialPageParam: 0,
    enabled,
    queryFn: async ({ pageParam }): Promise<PagedMedia> => (
      source === "favorites"
        ? mediaService.favorites(pageParam, limit, mediaKind)
        : mediaService.list(pageParam, limit, mediaKind)
    ),
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    ...(retainForSession ? { staleTime: Infinity, gcTime: Infinity } : {}),
  });
}

export function useMedia(
  limit = 20, source: MediaSource = "all", mediaKind?: MediaKindFilter, retainForSession = false, enabled = true,
) {
  return useInfiniteQuery(mediaQueryOptions(limit, source, mediaKind, retainForSession, enabled));
}
