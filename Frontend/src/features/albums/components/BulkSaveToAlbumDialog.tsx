import { useState, type FormEvent } from "react";
import { CustomDialog as AlertDialog, useCustomDialog } from "../../../components/ui/CustomDialog";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Button } from "../../../components/ui/Button";
import { ConfirmationDialog } from "../../../components/ui/ConfirmationDialog";
import { ErrorState, Spinner } from "../../../components/ui/Status";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { mediaPreviewUrl } from "../../../utils/media";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useDialogViewportStyle } from "../../../hooks/useDialogViewportStyle";
import { useAlbumMembership, useInfiniteAlbums, useInvalidateAlbums } from "../hooks/useAlbums";
import { albumService } from "../services/albumService";
import type { Album } from "../types";
import { ALBUM_NAME_MAX_LENGTH } from "../types";
import { AlbumSearchInput } from "./AlbumSearchInput";

interface Props {
  mediaIds: string[];
  onSaved?: () => void;
  onClose: () => void;
}

async function updateAlbumMedia(albumId: string, mediaIds: string[], action: "add" | "remove") {
  if (mediaIds.length === 0) return;
  if (action === "remove") await albumService.removeMediaBatch(albumId, mediaIds);
  else await albumService.addMediaBatch(albumId, mediaIds);
}

export function BulkSaveToAlbumDialog({ mediaIds, onSaved, onClose }: Props) {
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

  return (
    <AlertDialog.Root {...dialogProps}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" />
        <AlertDialog.Viewport className="confirmation-dialog-viewport" style={viewportStyle}>
          <AlertDialog.Popup className="confirmation-dialog album-dialog">
            <AlertDialog.Title className="confirmation-dialog__title">
              {t("Save {count} media items to albums", { count: selectedMediaIds.length })}
            </AlertDialog.Title>
            <div className="album-dialog__body" aria-busy={busy}>
              <AlbumSearchInput value={search} onChange={setSearch} />
              {isPending ? <Spinner label={t("Loading albums...")} /> : loadError ? (
                <ErrorState
                  message={t("Could not load albums.")}
                  onRetry={() => {
                    if (albumsQuery.isError) void albumsQuery.refetch();
                    if (membership.isError) void membership.refetch();
                  }}
                />
              ) : items.length === 0 ? (
                <p className="album-dialog__empty">{t(search.trim() ? "No matching albums." : "You have no albums yet. Create one below.")}</p>
              ) : (
                <ul className="album-picker" aria-label={t("Your albums")}>
                  {items.map((album) => (
                    <li key={album.id}>
                      <button
                        type="button"
                        className="album-picker__item"
                        disabled={busy}
                        aria-busy={pendingId === album.id || undefined}
                        aria-pressed={savedMediaIds(album).length === selectedMediaIds.length}
                        onClick={() => {
                          if (blocked) return;
                          const saved = savedMediaIds(album);
                          if (saved.length === selectedMediaIds.length) setRemoval({ album, mediaIds: saved });
                          else void toggle(album);
                        }}
                      >
                        <span className="album-picker__thumb" aria-hidden="true">
                          {album.previewMediaId ? <img src={mediaPreviewUrl(album.previewMediaId)} alt="" loading="lazy" /> : <Bookmark size={18} />}
                        </span>
                        <span className="album-picker__text">
                          <span className="album-picker__name">{album.name}</span>
                          <span className="album-picker__meta">
                            {t("{count} media", { count: album.mediaCount })} · {t(album.isPublic ? "Public" : "Private")}
                          </span>
                        </span>
                        <span className="album-picker__state">
                          {pendingId === album.id
                            ? <LoaderCircle size={16} className="spinner__wheel" aria-hidden="true" />
                            : t(savedMediaIds(album).length === selectedMediaIds.length ? "Remove from album" : "Save")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {albumsQuery.isFetchNextPageError ? (
                <ErrorState message={t("Could not load more albums.")} onRetry={() => void albumsQuery.fetchNextPage()} />
              ) : null}
              {albumsQuery.hasNextPage ? (
                <Button type="button" className="dialog-action dialog-action--normal" disabled={blocked || albumsQuery.isFetchingNextPage}
                  onClick={() => void albumsQuery.fetchNextPage()}>
                  {t(albumsQuery.isFetchingNextPage ? "Loading albums..." : "Load more")}
                </Button>
              ) : null}
              <form className="album-dialog__create" onSubmit={(event) => void create(event)}>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={ALBUM_NAME_MAX_LENGTH}
                  placeholder={t("New album name")}
                  aria-label={t("New album name")}
                  disabled={blocked}
                />
                <Button type="submit" className="dialog-action dialog-action--normal" busy={creating} disabled={!name.trim() || blocked}>
                  {t("Create")}
                </Button>
              </form>
            </div>
            <footer className="confirmation-dialog__actions dialog-actions">
              <Button type="button" className="dialog-action dialog-action--normal" disabled={blocked} onClick={dismiss}>{t("Done")}</Button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
      {removal && (
        <ConfirmationDialog
          title="Remove selected media from album?"
          confirmLabel="Remove from album"
          danger
          onClose={() => setRemoval(null)}
          onConfirm={async () => { await toggle(removal.album, removal.mediaIds); }}
        >
          <p>{t("Remove {count} media items from “{name}”? They will remain in your gallery.", {
            count: removal.mediaIds.length,
            name: removal.album.name,
          })}</p>
        </ConfirmationDialog>
      )}
    </AlertDialog.Root>
  );
}
