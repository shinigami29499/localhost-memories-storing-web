import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInfiniteAlbums, useInvalidateAlbums } from "../../features/albums/hooks/useAlbums";
import { albumService } from "../../features/albums/services/albumService";
import type { Album } from "../../features/albums/types";
import { useMediaSelectionDrag } from "../../features/media/hooks/useMediaSelectionDrag";
import { useAuthStore } from "../../store/authStore";

export function useAlbumsPage() {
  const navigate = useNavigate();
  const me = useAuthStore((state) => state.user);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Album | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const albumsQuery = useInfiniteAlbums("feed");
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !albumsQuery.hasNextPage || albumsQuery.isFetching || albumsQuery.isFetchNextPageError) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); void albumsQuery.fetchNextPage(); }
    }, { rootMargin: "0px 0px 2000px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [albumsQuery.hasNextPage, albumsQuery.isFetching, albumsQuery.isFetchNextPageError, albumsQuery.fetchNextPage]);
  const invalidate = useInvalidateAlbums();
  const items = albumsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedAlbums = items.filter((album) => selectedIds.has(album.id));
  const canDelete = selectedAlbums.length > 0 && selectedAlbums.every((album) => album.owner.id === me?.id);
  const cancelSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); };
  const setSelected = (id: string, selected: boolean) => {
    setSelectionMode(true);
    setSelectedIds((current) => { const next = new Set(current); if (selected) next.add(id); else next.delete(id); return next; });
  };
  const selectionDragHandlers = useMediaSelectionDrag(!creating && !editing && !deleting, selectionMode, (id) => selectedIds.has(id), setSelected);
  useEffect(() => {
    if (!selectionMode || deleting) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); cancelSelection(); } };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectionMode, deleting]);
  const deleteSelected = async () => {
    try {
      for (const album of selectedAlbums) {
        await albumService.remove(album.id);
        setSelectedIds((current) => { const next = new Set(current); next.delete(album.id); return next; });
      }
      cancelSelection();
    } finally { await invalidate(); }
  };
  const deleteEditing = async () => { if (editing) { await albumService.remove(editing.id); await invalidate(); } };
  const updateEditing = async (input: Parameters<typeof albumService.update>[1]) => { if (editing) { await albumService.update(editing.id, input); await invalidate(); } };
  const createAlbum = async ({ name, isPublic }: { name: string; isPublic?: boolean }) => {
    const created = await albumService.create({ name, isPublic });
    await invalidate();
    return () => navigate(`/gallery/album/${created.id}`);
  };
  return { me, creating, setCreating, editing, setEditing, selectionMode, selectedIds, deleting, setDeleting, albumsQuery, sentinelRef, items, selectedAlbums, canDelete, cancelSelection, setSelected, selectionDragHandlers, deleteSelected, deleteEditing, updateEditing, createAlbum };
}
