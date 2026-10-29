import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { albumService } from "../services/albumService";
import type { AlbumScope } from "../types";
import type { MediaKindFilter } from "../../media/types";

export const albumKeys = {
  all: ["albums"] as const,
  list: (scope: AlbumScope, mediaId?: string) =>
    ["albums", "list", scope, mediaId ?? null] as const,
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
  return useCallback(() => queryClient.invalidateQueries({ queryKey: albumKeys.all }), [queryClient]);
}
