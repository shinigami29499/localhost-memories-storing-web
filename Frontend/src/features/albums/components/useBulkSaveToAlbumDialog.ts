import { useState,type FormEvent } from "react";
import { useCustomDialog } from "../../../components/ui/CustomDialog";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useDialogViewportStyle } from "../../../hooks/useDialogViewportStyle";
import { ApiError } from "../../../services/api";
import { useAlbumMembership,useInfiniteAlbums,useInvalidateAlbums } from "../hooks/useAlbums";
import { albumService } from "../services/albumService";
import type { Album } from "../types";

export interface BulkSaveToAlbumDialogProps {
  mediaIds: string[];
  onSaved?: () => void;
  onClose: () => void;
}

async function updateAlbumMedia(albumId: string, mediaIds: string[], action: "add" | "remove") {
  if (mediaIds.length === 0) return;
  if (action === "remove") await albumService.removeMediaBatch(albumId, mediaIds);
  else await albumService.addMediaBatch(albumId, mediaIds);
}

export function useBulkSaveToAlbumDialog({ mediaIds, onSaved, onClose }: BulkSaveToAlbumDialogProps) {
  const { t } = useLocale();
  const viewportStyle = useDialogViewportStyle();
  const [selectedMediaIds] = useState(mediaIds);
  const [search, setSearch] = useState("");
  const albumsQuery = useInfiniteAlbums("mine", true, 30, undefined, useDebouncedValue(search));
  const membership = useAlbumMembership(selectedMediaIds);
  const invalidate = useInvalidateAlbums();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [removal, setRemoval] = useState<{ album: Album; mediaIds: string[] } | null>(null);

  const membershipByMediaId = new Map(membership.data?.items.map((item) => [item.mediaId, item.albumIds]) ?? []);
  const savedMediaIds = (album: Album) => selectedMediaIds.filter((id) =>
    membershipByMediaId.get(id)?.includes(album.id));

  const reportSaveResults = async (albumName: string, undo: () => Promise<void>) => {
    await invalidate();
    showToast.success(t("Successfully saved to album {name}", { name: albumName }), { undo, highlight: [albumName] });
    onSaved?.();
    return true;
  };

  const toggle = async (album: Album, removalIds?: string[]) => {
    if (pendingId !== null || creating) return;
    setPendingId(album.id);
    try {
      const saved = savedMediaIds(album);
      const remove = removalIds !== undefined;
      const mediaIdsToUpdate = remove
        ? removalIds
        : selectedMediaIds.filter((mediaId) => !saved.includes(mediaId));
      await updateAlbumMedia(album.id, mediaIdsToUpdate, remove ? "remove" : "add");
      await invalidate();
      const undo = async () => {
        await updateAlbumMedia(album.id, mediaIdsToUpdate, remove ? "add" : "remove");
        await invalidate();
      };
      if (remove) {
        showToast.delete(t("Removed from album"), { undo });
      } else {
        showToast.success(t("Successfully saved to album {name}", { name: album.name }), { undo, highlight: [album.name] });
        onSaved?.();
      }
    } catch (error) {
      if (removalIds) throw error;
      showToast.error(error instanceof ApiError ? error.message : t("Could not complete this action. Please retry."));
    } finally {
      setPendingId(null);
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating || pendingId !== null) return;
    setCreating(true);
    try {
      const album = await albumService.create({ name: trimmed });
      setName("");
      await updateAlbumMedia(album.id, selectedMediaIds, "add");
      await reportSaveResults(
        album.name,
        async () => {
          await albumService.remove(album.id);
          await invalidate();
        },
      );
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not complete this action. Please retry."));
    } finally {
      setCreating(false);
    }
  };

  const items = albumsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isPending = albumsQuery.isPending || membership.isPending;
  const loadError = (albumsQuery.isError && !albumsQuery.data) || membership.isError;
  const busy = pendingId !== null || creating;
  const blocked = busy || removal !== null;
  const { dialogProps, dismiss } = useCustomDialog(onClose, { blocked });

  return { t, viewportStyle, selectedMediaIds, search, setSearch, albumsQuery, membership, pendingId, name, setName, creating, removal, setRemoval, savedMediaIds, toggle, create, items, isPending, loadError, busy, blocked, dialogProps, dismiss };
}
