import { useMemo, useRef, useState } from "react";
import { format, isFuture, isSameDay, isValid, parseISO } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import { showToast } from "../../components/ui/Toast";
import { useLocale } from "../../context/LocaleContext";
import { useInfiniteAlbums, useInvalidateAlbums } from "../../features/albums/hooks/useAlbums";
import { albumService } from "../../features/albums/services/albumService";
import type { Album } from "../../features/albums/types";
import { ApiError } from "../../services/api";

export function useAlbumsPage({ onAlbumCreated, listLocationKey }: {
  onAlbumCreated?: (albumId: string) => void;
  listLocationKey?: string;
} = {}) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { key } = useLocation();
  const storageKey = `gallery-album-position:${listLocationKey ?? key}`;
  const [creating, setCreating] = useState(false);
  const [favoriteBusyAlbumId, setFavoriteBusyAlbumId] = useState<string | null>(null);
  const favoritePending = useRef(false);
  const [position, setPosition] = useState(() => readAlbumPosition(storageKey));
  const { date: selectedDate } = position;
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const today = new Date();
  const albumsQuery = useInfiniteAlbums("feed");
  const invalidate = useInvalidateAlbums();
  const { albumsByDate, albumDateCounts } = useMemo(() => {
    const albumsByDate = new Map<string, Album[]>();
    const seen = new Set<string>();
    for (const page of albumsQuery.data?.pages ?? []) {
      for (const album of page.items) {
        const date = albumDayKey(album);
        if (!date || seen.has(album.id)) continue;
        seen.add(album.id);
        const group = albumsByDate.get(date);
        if (group) group.push(album);
        else albumsByDate.set(date, [album]);
      }
    }
    const albumDateCounts = new Map(Array.from(albumsByDate, ([date, albums]) => [date, albums.length]));
    return { albumsByDate, albumDateCounts };
  }, [albumsQuery.data]);
  const items = useMemo(() => albumsByDate.get(selectedDateKey) ?? [], [albumsByDate, selectedDateKey]);
  const matchingIndex = position.albumId ? items.findIndex((album) => album.id === position.albumId) : -1;
  const albumIndex = matchingIndex >= 0 ? matchingIndex : Math.max(0, Math.min(position.index, items.length - 1));
  const selectDate = (date: Date) => {
    if (!isSameDay(date, selectedDate)) setPosition({ date, index: 0 });
  };
  const selectAlbumIndex = (index: number) => setPosition({
    date: selectedDate, index, albumId: items[index]?.id,
  });
  const rememberPosition = (date: string, index: number, albumId?: string) => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ date, index, albumId }));
    } catch {
      // Gallery still works when session storage is unavailable.
    }
  };
  const rememberOpenedAlbum = (index: number) => rememberPosition(selectedDateKey, index, items[index]?.id);
  const createAlbum = async ({ name, isPublic }: { name: string; isPublic?: boolean }, albumDate = selectedDateKey) => {
    const created = await albumService.create({ name, isPublic, albumDate });
    await invalidate();
    return () => {
      rememberPosition(albumDayKey(created) ?? albumDate, 0, created.id);
      if (onAlbumCreated) onAlbumCreated(created.id);
      else void navigate(`/album/${created.id}`);
    };
  };
  const toggleFavorite = async (albumId: string, isFavorited: boolean) => {
    if (favoritePending.current) return;
    favoritePending.current = true;
    setFavoriteBusyAlbumId(albumId);
    try {
      if (isFavorited) await albumService.unfavorite(albumId);
      else await albumService.favorite(albumId);
      await invalidate();
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not update favorites."));
    } finally {
      favoritePending.current = false;
      setFavoriteBusyAlbumId(null);
    }
  };
  return { creating, setCreating, today, selectedDate, selectedDateKey, selectDate, albumsQuery, albumDateCounts, items, albumIndex,
    selectAlbumIndex, rememberOpenedAlbum, createAlbum, favoriteBusyAlbumId, toggleFavorite };
}

function albumDayKey(album: Album): string | undefined {
  if (album.albumDate) return album.albumDate;
  const createdAt = new Date(album.createdAt);
  return isValid(createdAt) ? format(createdAt, "yyyy-MM-dd") : undefined;
}

function readAlbumPosition(key: string): { date: Date; index: number; albumId?: string } {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (typeof saved?.date === "string") {
      const date = parseISO(saved.date);
      if (isValid(date) && !isFuture(date)) {
        return {
          date,
          index: Number.isSafeInteger(saved.index) ? Math.max(0, saved.index) : 0,
          albumId: typeof saved.albumId === "string" ? saved.albumId : undefined,
        };
      }
    }
  } catch {
    // Ignore unavailable storage or malformed history data.
  }
  return { date: new Date(), index: 0 };
}
