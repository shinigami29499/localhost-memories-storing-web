import { useInfiniteQuery } from "@tanstack/react-query";
import { mediaService } from "../services/mediaService";
import type { MediaKindFilter, PagedMedia } from "../types";

export type MediaSource = "all" | "favorites";

export function useMedia(limit = 20, source: MediaSource = "all", mediaKind?: MediaKindFilter) {
  return useInfiniteQuery({
    queryKey: ["media", source, mediaKind ?? "all", limit],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<PagedMedia> => (
      source === "favorites"
        ? mediaService.favorites(pageParam, limit, mediaKind)
        : mediaService.list(pageParam, limit, mediaKind)
    ),
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
  });
}
