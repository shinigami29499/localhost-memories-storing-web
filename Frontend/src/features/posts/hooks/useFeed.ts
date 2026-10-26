import { useInfiniteQuery } from "@tanstack/react-query";
import { postService } from "../services/postService";
import type { Post } from "../types";

export interface FeedPage {
  items: Post[];
  total: number;
  nextOffset: number | undefined;
}

/** Infinite feed loader: offset/limit paging into an accumulating list. */
export function useFeed(limit = 5) {
  return useInfiniteQuery({
    queryKey: ["feed", limit],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<FeedPage> => {
      const offset = pageParam;
      const page = await postService.feed(offset, limit);
      const next = offset + page.items.length;
      return {
        items: page.items,
        total: page.total,
        nextOffset: page.items.length > 0 && next < page.total ? next : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });
}
