import { useInfiniteQuery } from "@tanstack/react-query";
import { postService, type MediaKindFilter } from "../services/postService";
import type { FeedPage } from "./useFeed";

export interface GalleryFeedOptions {
  source?: "feed" | "favorites";
  mediaKind?: MediaKindFilter;
}

/** Infinite gallery loader for the regular feed or favorites, optionally filtered by media kind. */
export function useGalleryFeed(limit = 20, { source = "feed", mediaKind }: GalleryFeedOptions = {}) {
  return useInfiniteQuery({
    queryKey: ["feed", "gallery", limit, source, mediaKind ?? "all"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<FeedPage> => {
      const load = source === "favorites" ? postService.favorites : postService.feed;
      const page = mediaKind ? await load(pageParam, limit, mediaKind) : await load(pageParam, limit);
      const next = pageParam + page.items.length;
      return {
        items: page.items,
        total: page.total,
        nextOffset: page.items.length > 0 && next < page.total ? next : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    // Favorites change whenever a heart is toggled elsewhere, so always revalidate them.
    staleTime: source === "favorites" ? 0 : 5 * 60 * 1000,
  });
}
