import { useQuery } from "@tanstack/react-query";
import { postService } from "../services/postService";
import type { AdminPost } from "../types";

export type PostTab = "all" | "image" | "video";

export function useAdminPosts(
  tab: PostTab,
  offset: number,
  limit: number,
) {
  const posts = useQuery({
    queryKey: ["admin-posts", tab, offset, limit],
    queryFn: () => postService.listAll(offset, limit),
  });

  const filteredPosts = posts.data?.items.filter((post) => {
    if (tab === "all") return true;
    if (tab === "image") return post.media.length > 0 && post.media[0].mediaKind === "image";
    if (tab === "video") return post.media.length > 0 && post.media[0].mediaKind === "video";
    return true;
  }) ?? [];

  return {
    posts: {
      ...posts,
      data: posts.data ? {
        ...posts.data,
        items: filteredPosts,
        total: posts.data.total, // Keep original total for pagination
      } : undefined,
    },
    filteredPosts,
  };
}