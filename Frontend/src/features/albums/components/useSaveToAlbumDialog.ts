import { useState, type FormEvent } from "react";
import { useCustomDialog } from "../../../components/ui/CustomDialog";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useAlbumMembership, useInfiniteAlbums, useInvalidateAlbums } from "../hooks/useAlbums";
import { albumService } from "../services/albumService";
import type { Album } from "../types";

export interface SaveToAlbumDialogProps {
  mediaIds: string[];
  onClose: () => void;
  portalContainer?: HTMLElement | null;
}

export function useSaveToAlbumDialog({ mediaIds, onClose }: SaveToAlbumDialogProps) {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const albumsQuery = useInfiniteAlbums("mine", true, 30, undefined, useDebouncedValue(search));
  const membership = useAlbumMembership(mediaIds);
  const membershipByMediaId = new Map(membership.data?.items.map((item) => [item.mediaId, item.albumIds]) ?? []);
  const savedMediaIds = (album: Album) => mediaIds.filter((id) => membershipByMediaId.get(id)?.includes(album.id));
  const invalidate = useInvalidateAlbums();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [removal, setRemoval] = useState<{ album: Album; mediaIds: string[] } | null>(null);
  const busy = pendingId !== null || creating;
  const blocked = busy || removal !== null;
  const { dialogProps, dismiss } = useCustomDialog(onClose, { blocked });

  const describe = (err: unknown) => (err instanceof ApiError ? err.message : t("Could not complete this action. Please retry."));

  const toggle = async (album: Album, removalIds?: string[]) => {
    if (busy) return;
    setPendingId(album.id);
    try {
      const saved = savedMediaIds(album);
      const removing = removalIds !== undefined;
      const mediaIdsToChange = removing
        ? removalIds
        : mediaIds.filter((mediaId) => !saved.includes(mediaId));
      const results = await Promise.allSettled(mediaIdsToChange.map((mediaId) =>
        removing
          ? albumService.removeMedia(album.id, mediaId)
          : albumService.addMedia(album.id, mediaId),
      ));
      await invalidate();
      const failed = results.filter((result) => result.status === "rejected").length;
      const undo = async () => {
        await Promise.all(mediaIdsToChange.map((mediaId) =>
          removing
            ? albumService.addMedia(album.id, mediaId)
            : albumService.removeMedia(album.id, mediaId),
        ));
        await invalidate();
      };
      if (failed > 0) {
        if (removing) {
          const failure = results.find((result) => result.status === "rejected");
          if (failure?.status === "rejected") throw failure.reason;
        }
        showToast.error(t("{count} media items could not be updated.", { count: failed }));
      } else if (removing) {
        showToast.delete(t("Removed from album"), { undo });
      } else {
        showToast.success(t("Successfully saved to album {name}", { name: album.name }), { undo, highlight: [album.name] });
      }
    } catch (err) {
      if (removalIds) throw err;
      showToast.error(describe(err));
    } finally {
      setPendingId(null);
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setCreating(true);
    try {
      const album = await albumService.create({ name: trimmed });
      setName("");
      const results = await Promise.allSettled(mediaIds.map((mediaId) => albumService.addMedia(album.id, mediaId)));
      await invalidate();
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed > 0) {
        showToast.error(t("{count} media items could not be saved.", { count: failed }));
      } else {
        showToast.success(t("Successfully saved to album {name}", { name: album.name }), {
          highlight: [album.name],
          undo: async () => {
            await albumService.remove(album.id);
            await invalidate();
          },
        });
      }
    } catch (err) {
      showToast.error(describe(err));
    } finally {
      setCreating(false);
    }
  };

  const items = albumsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isPending = albumsQuery.isPending || membership.isPending;
  const loadError = (albumsQuery.isError && !albumsQuery.data) || membership.isError;

  return { t, search, setSearch, albumsQuery, membership, savedMediaIds, pendingId, name, setName, creating, removal, setRemoval, busy, blocked, dialogProps, dismiss, toggle, create, items, isPending, loadError };
}
