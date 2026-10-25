import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { postService } from "../services/postService";
import type { Post } from "../types";

export interface PagedFeedResult {
  items: Post[];
  total: number;
  offset: number;
  limit: number;
}

/** Page-based feed loader: fetches pages by offset/limit. */
export function usePagedFeed(page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: ["feed", "paged", limit, offset],
    queryFn: async (): Promise<PagedFeedResult> => {
      const result = await postService.feed(offset, limit);
      return {
        items: result.items,
        total: result.total,
        offset: result.offset,
        limit: result.limit,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
}