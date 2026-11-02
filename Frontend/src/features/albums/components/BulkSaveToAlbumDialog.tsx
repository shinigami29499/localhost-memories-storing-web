import { useState, type FormEvent } from "react";
import { useQueries } from "@tanstack/react-query";
import { CustomDialog as AlertDialog, useCustomDialog } from "../../../components/ui/CustomDialog";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Button } from "../../../components/ui/Button";
import { ErrorState, Spinner } from "../../../components/ui/Status";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { mediaPreviewUrl } from "../../../utils/media";
import { albumKeys, useInvalidateAlbums } from "../hooks/useAlbums";
import { albumService } from "../services/albumService";
import type { Album } from "../types";
import { ALBUM_NAME_MAX_LENGTH } from "../types";

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
  const [selectedMediaIds] = useState(mediaIds);
  const albumQueries = useQueries({
    queries: selectedMediaIds.map((mediaId) => ({
      queryKey: albumKeys.list("mine", mediaId),
      queryFn: () => albumService.list("mine", mediaId),
    })),
  });
  const invalidate = useInvalidateAlbums();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const savedMediaIds = (album: Album) => selectedMediaIds.filter((_, index) =>
    albumQueries[index]?.data?.find((item) => item.id === album.id)?.containsMedia,
  );

  const reportSaveResults = async (albumName: string, undo: () => Promise<void>) => {
    await invalidate();
    showToast.success(t("Successfully saved to album {name}", { name: albumName }), { undo, highlight: [albumName] });
    onSaved?.();
    return true;
  };

  const toggle = async (album: Album) => {
    if (pendingId !== null || creating) return;
    setPendingId(album.id);
    try {
      const saved = savedMediaIds(album);
      const remove = saved.length === selectedMediaIds.length;
      const mediaIdsToUpdate = remove
        ? saved
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

  const items = albumQueries[0]?.data ?? [];
  const isPending = albumQueries.some((query) => query.isPending);
  const failedQueries = albumQueries.filter((query) => query.isError);
  const busy = pendingId !== null || creating;
  const { dialogProps, dismiss } = useCustomDialog(onClose, { blocked: busy });

  return (
    <AlertDialog.Root {...dialogProps}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" />
        <AlertDialog.Viewport className="confirmation-dialog-viewport">
          <AlertDialog.Popup className="confirmation-dialog album-dialog">
            <AlertDialog.Title className="confirmation-dialog__title">
              {t("Save {count} media items to albums", { count: selectedMediaIds.length })}
            </AlertDialog.Title>
            <div className="album-dialog__body" aria-busy={busy}>
              {isPending ? <Spinner label={t("Loading albums…")} /> : failedQueries.length > 0 ? (
                <ErrorState
                  message={t("Could not load albums.")}
                  onRetry={() => {
                    for (const query of failedQueries) void query.refetch();
                  }}
                />
              ) : items.length === 0 ? (
                <p className="album-dialog__empty">{t("You have no albums yet. Create one below.")}</p>
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
                        onClick={() => void toggle(album)}
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
              <form className="album-dialog__create" onSubmit={(event) => void create(event)}>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={ALBUM_NAME_MAX_LENGTH}
                  placeholder={t("New album name")}
                  aria-label={t("New album name")}
                  disabled={busy}
                />
                <Button type="submit" variant="secondary" busy={creating} disabled={!name.trim() || busy}>
                  {t("Create")}
                </Button>
              </form>
            </div>
            <footer className="confirmation-dialog__actions">
              <button type="button" className="btn btn--primary" disabled={busy} onClick={dismiss}>{t("Done")}</button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
