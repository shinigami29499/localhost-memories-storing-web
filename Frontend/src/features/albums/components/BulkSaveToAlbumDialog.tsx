import { useState, type FormEvent } from "react";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";
import { X } from "@/components/animate-ui/icons/x";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Button } from "../../../components/ui/Button";
import { ErrorState, Spinner } from "../../../components/ui/Status";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { mediaUrl } from "../../../utils/media";
import { useAlbums, useInvalidateAlbums } from "../hooks/useAlbums";
import { albumService } from "../services/albumService";
import { ALBUM_NAME_MAX_LENGTH } from "../types";

interface Props {
  mediaIds: string[];
  onSaved: () => void;
  onClose: () => void;
}

async function addMediaToAlbum(albumId: string, mediaIds: string[]) {
  const results: PromiseSettledResult<unknown>[] = [];
  for (let offset = 0; offset < mediaIds.length; offset += 5) {
    const batch = mediaIds.slice(offset, offset + 5);
    results.push(...await Promise.allSettled(batch.map((mediaId) => albumService.addMedia(albumId, mediaId))));
  }
  return results;
}

export function BulkSaveToAlbumDialog({ mediaIds, onSaved, onClose }: Props) {
  const { t } = useLocale();
  const albums = useAlbums("mine");
  const invalidate = useInvalidateAlbums();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const reportSaveResults = async (results: PromiseSettledResult<unknown>[]) => {
    await invalidate();
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed > 0) {
      showToast.error(t("{failed} of {total} media items could not be saved.", { failed, total: mediaIds.length }));
      return false;
    }
    showToast.success(t("Media saved successfully"));
    onSaved();
    return true;
  };

  const save = async (albumId: string) => {
    if (pendingId !== null || creating) return;
    setPendingId(albumId);
    try {
      await reportSaveResults(await addMediaToAlbum(albumId, mediaIds));
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
      await reportSaveResults(await addMediaToAlbum(album.id, mediaIds));
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not complete this action. Please retry."));
    } finally {
      setCreating(false);
    }
  };

  const items = albums.data ?? [];
  const busy = pendingId !== null || creating;

  return (
    <AlertDialog.Root defaultOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" onClick={onClose} />
        <AlertDialog.Viewport
          className="confirmation-dialog-viewport"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <AlertDialog.Popup from="top" className="confirmation-dialog album-dialog" onClick={(event) => event.stopPropagation()}>
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button
                type="button"
                className="btn btn--ghost confirmation-dialog__close"
                aria-label={t("Close")}
                title={t("Close")}
                disabled={busy}
                onClick={onClose}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </AnimateIcon>
            <AlertDialog.Title className="confirmation-dialog__title">
              {t("Save {count} media items to albums", { count: mediaIds.length })}
            </AlertDialog.Title>
            <div className="album-dialog__body" aria-busy={busy}>
              {albums.isPending ? <Spinner label={t("Loading albums…")} /> : albums.isError ? (
                <ErrorState message={t("Could not load albums.")} onRetry={() => void albums.refetch()} />
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
                        onClick={() => void save(album.id)}
                      >
                        <span className="album-picker__thumb" aria-hidden="true">
                          {album.previewMediaId ? <img src={mediaUrl(album.previewMediaId)} alt="" loading="lazy" /> : <Bookmark size={18} />}
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
                            : t("Save")}
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
              <button type="button" className="btn btn--primary" disabled={busy} onClick={onClose}>{t("Done")}</button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
