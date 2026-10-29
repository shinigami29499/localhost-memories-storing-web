import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { collectionService } from "../services/collectionService";
import type { CollectionScope } from "../types";

export const collectionKeys = {
  all: ["collections"] as const,
  list: (scope: CollectionScope, postId?: string) => ["collections", "list", scope, postId ?? null] as const,
  detail: (collectionId: string) => ["collections", "detail", collectionId] as const,
  posts: (collectionId: string, offset: number, limit: number) =>
    ["collections", "detail", collectionId, "posts", offset, limit] as const,
};

export function useCollections(scope: CollectionScope = "mine", postId?: string, enabled = true) {
  return useQuery({
    queryKey: collectionKeys.list(scope, postId),
    queryFn: () => collectionService.list(scope, postId),
    enabled,
  });
}

export function useCollection(collectionId: string | undefined) {
  return useQuery({
    queryKey: collectionKeys.detail(collectionId ?? ""),
    queryFn: () => collectionService.get(collectionId!),
    enabled: Boolean(collectionId),
    retry: false,
  });
}

export function useCollectionPosts(collectionId: string | undefined, page = 1, limit = 20, enabled = true) {
  const offset = (page - 1) * limit;
  return useQuery({
    queryKey: collectionKeys.posts(collectionId ?? "", offset, limit),
    queryFn: () => collectionService.posts(collectionId!, offset, limit),
    enabled: Boolean(collectionId) && enabled,
    placeholderData: keepPreviousData,
  });
}

/** Refreshes every collection list, detail, and post page after a change. */
export function useInvalidateCollections() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: collectionKeys.all }), [queryClient]);
}
