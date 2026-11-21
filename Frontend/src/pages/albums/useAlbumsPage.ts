import { useMemo, useState } from "react";
import { format, isFuture, isSameDay, isValid, parseISO } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import { useInfiniteAlbums, useInvalidateAlbums } from "../../features/albums/hooks/useAlbums";
import { albumService } from "../../features/albums/services/albumService";

export function useAlbumsPage() {
  const navigate = useNavigate();
  const { key } = useLocation();
  const storageKey = `gallery-album-position:${key}`;
  const [creating, setCreating] = useState(false);
  const [position, setPosition] = useState(() => readAlbumPosition(storageKey));
  const { date: selectedDate } = position;
  const today = new Date();
  const albumsQuery = useInfiniteAlbums("feed");
  const invalidate = useInvalidateAlbums();
  const loadedAlbums = useMemo(() => albumsQuery.data?.pages.flatMap((page) => page.items) ?? [], [albumsQuery.data]);
  const albumDates = useMemo(() => [...new Set(loadedAlbums.map((album) => new Date(album.createdAt))
    .filter(isValid).map((date) => format(date, "yyyy-MM-dd")))].sort(), [loadedAlbums]);
  const items = useMemo(() => loadedAlbums.filter((album) => isSameDay(new Date(album.createdAt), selectedDate)),
    [loadedAlbums, selectedDate]);
  const matchingIndex = position.albumId ? items.findIndex((album) => album.id === position.albumId) : -1;
  const albumIndex = matchingIndex >= 0 ? matchingIndex : Math.max(0, Math.min(position.index, items.length - 1));
  const selectDate = (date: Date) => {
    if (!isSameDay(date, selectedDate)) setPosition({ date, index: 0 });
  };
  const selectAlbumIndex = (index: number) => setPosition({
    date: selectedDate, index, albumId: items[index]?.id,
  });
  const rememberOpenedAlbum = (index: number) => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        date: format(selectedDate, "yyyy-MM-dd"), index, albumId: items[index]?.id,
      }));
    } catch {
      // Gallery still works when session storage is unavailable.
    }
  };
  const createAlbum = async ({ name, isPublic }: { name: string; isPublic?: boolean }) => {
    const created = await albumService.create({ name, isPublic });
    await invalidate();
    return () => navigate(`/gallery/album/${created.id}`);
  };
  return { creating, setCreating, today, selectedDate, selectDate, albumsQuery, albumDates, items, albumIndex,
    selectAlbumIndex, rememberOpenedAlbum, createAlbum };
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
