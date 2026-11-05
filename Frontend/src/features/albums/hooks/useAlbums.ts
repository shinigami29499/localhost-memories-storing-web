import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { albumService } from "../services/albumService";
import type { AlbumScope } from "../types";
import type { MediaKindFilter } from "../../media/types";
import { useAuthStore } from "../../../store/authStore";

export const albumKeys = {
  all: ["albums"] as const,
  list: (scope: AlbumScope, mediaId?: string) =>
    ["albums", "list", scope, mediaId ?? null] as const,
  page: (scope: AlbumScope | "feed", limit: number, mediaId?: string, search = "") =>
    ["albums", "page", scope, limit, mediaId ?? null, search.trim()] as const,
  membership: (viewerId: string | undefined, mediaIds: string[]) =>
    ["albums", "membership", viewerId, [...mediaIds].sort()] as const,
  detail: (albumId: string) => ["albums", "detail", albumId] as const,
  media: (albumId: string, offset: number, limit: number, mediaKind?: MediaKindFilter) =>
    ["albums", "detail", albumId, "media", offset, limit, mediaKind ?? null] as const,
  infiniteMedia: (albumId: string, limit: number, mediaKind?: MediaKindFilter) =>
    ["albums", "detail", albumId, "media", "infinite", limit, mediaKind ?? null] as const,
};

export function useAlbums(scope: AlbumScope = "mine", enabled = true, mediaId?: string) {
  return useQuery({
    queryKey: albumKeys.list(scope, mediaId),
    queryFn: () => albumService.list(scope, mediaId),
    enabled,
  });
}

export function useInfiniteAlbums(scope: AlbumScope | "feed", enabled = true, limit = 30, mediaId?: string, search = "") {
  return useInfiniteQuery({
    queryKey: albumKeys.page(scope, limit, mediaId, search),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => albumService.page(scope, pageParam, limit, mediaId, search, signal),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined,
    enabled,
  });
}

export function useAlbumMembership(mediaIds: string[]) {
  const viewerId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: albumKeys.membership(viewerId, mediaIds),
    queryFn: ({ signal }) => albumService.membership(mediaIds, signal),
    enabled: Boolean(viewerId) && mediaIds.length > 0,
  });
}

export function useAlbum(albumId: string | undefined) {
  return useQuery({
    queryKey: albumKeys.detail(albumId ?? ""),
    queryFn: () => albumService.get(albumId!),
    enabled: Boolean(albumId),
    retry: false,
  });
}

export function useAlbumMedia(
  albumId: string | undefined, page = 1, limit = 20, enabled = true, mediaKind?: MediaKindFilter,
) {
  const offset = (page - 1) * limit;
  return useQuery({
    queryKey: albumKeys.media(albumId ?? "", offset, limit, mediaKind),
    queryFn: () => albumService.media(albumId!, offset, limit, mediaKind),
    enabled: Boolean(albumId) && enabled,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === albumId && previousQuery?.queryKey[6] === (mediaKind ?? null)
        ? previousData
        : undefined,
  });
}

export function useInfiniteAlbumMedia(
  albumId: string | undefined, limit = 20, enabled = true, mediaKind?: MediaKindFilter,
) {
  return useInfiniteQuery({
    queryKey: albumKeys.infiniteMedia(albumId ?? "", limit, mediaKind),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => albumService.media(albumId!, pageParam, limit, mediaKind),
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled: Boolean(albumId) && enabled,
  });
}

/** Refreshes every album list, detail, and media page after a change. */
export function useInvalidateAlbums() {
  const queryClient = useQueryClient();
  return useCallback(() => Promise.all([
    queryClient.invalidateQueries({ queryKey: albumKeys.all }),
    queryClient.invalidateQueries({ queryKey: ["previews"] }),
    queryClient.invalidateQueries({ queryKey: ["picker-image"] }),
  ]).then(() => undefined), [queryClient]);
}
