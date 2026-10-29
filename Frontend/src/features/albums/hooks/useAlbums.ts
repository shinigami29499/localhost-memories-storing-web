import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { albumService } from "../services/albumService";
import type { AlbumScope } from "../types";

export const albumKeys = {
  all: ["albums"] as const,
  list: (scope: AlbumScope, mediaId?: string) =>
    ["albums", "list", scope, mediaId ?? null] as const,
  detail: (albumId: string) => ["albums", "detail", albumId] as const,
  media: (albumId: string, offset: number, limit: number) =>
    ["albums", "detail", albumId, "media", offset, limit] as const,
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

export function useAlbumMedia(albumId: string | undefined, page = 1, limit = 20, enabled = true) {
  const offset = (page - 1) * limit;
  return useQuery({
    queryKey: albumKeys.media(albumId ?? "", offset, limit),
    queryFn: () => albumService.media(albumId!, offset, limit),
    enabled: Boolean(albumId) && enabled,
    placeholderData: keepPreviousData,
  });
}

/** Refreshes every album list, detail, and media page after a change. */
export function useInvalidateAlbums() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: albumKeys.all }), [queryClient]);
}
