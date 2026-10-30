import { useState, type FormEvent } from "react";
import { useQueries } from "@tanstack/react-query";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";
import { X } from "@/components/animate-ui/icons/x";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Button } from "../../../components/ui/Button";
import { Spinner, ErrorState } from "../../../components/ui/Status";
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
  onClose: () => void;
  portalContainer?: HTMLElement | null;
}

/** Lists the viewer's albums with save state for selected media, and creates albums inline. */
export function SaveToAlbumDialog({ mediaIds, onClose, portalContainer }: Props) {
  const { t } = useLocale();
  const albumQueries = useQueries({
    queries: mediaIds.map((mediaId) => ({
      queryKey: albumKeys.list("mine", mediaId),
      queryFn: () => albumService.list("mine", mediaId),
    })),
  });
  const invalidate = useInvalidateAlbums();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const describe = (err: unknown) => (err instanceof ApiError ? err.message : t("Could not complete this action. Please retry."));

  const toggle = async (album: Album) => {
    if (pendingId !== null) return;
    setPendingId(album.id);
    try {
      const savedMediaIds = mediaIds.filter((_, index) =>
        albumQueries[index]?.data?.find((item) => item.id === album.id)?.containsMedia,
      );
      const removing = savedMediaIds.length === mediaIds.length;
      const mediaIdsToChange = removing
        ? savedMediaIds
        : mediaIds.filter((mediaId) => !savedMediaIds.includes(mediaId));
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
        showToast.error(t("{count} media items could not be updated.", { count: failed }));
      } else if (removing) {
        showToast.success(t("Removed from album"), { undo });
      } else {
        showToast.success(t("Successfully saved to album {name}", { name: album.name }), { undo });
      }
    } catch (err) {
      showToast.error(describe(err));
    } finally {
      setPendingId(null);
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating) return;
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

  const items = albumQueries[0]?.data ?? [];
  const isPending = albumQueries.some((query) => query.isPending);
  const failedQueries = albumQueries.filter((query) => query.isError);

  return (
    <AlertDialog.Root defaultOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialog.Portal container={portalContainer}>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" onClick={onClose} />
        <AlertDialog.Viewport
          className="confirmation-dialog-viewport"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <AlertDialog.Popup from="top" className="confirmation-dialog album-dialog" onClick={(e) => e.stopPropagation()}>
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button type="button" className="btn btn--ghost confirmation-dialog__close" aria-label={t("Close")} title={t("Close")} onClick={onClose}>
                <X size={20} aria-hidden="true" />
              </button>
            </AnimateIcon>
            <AlertDialog.Title className="confirmation-dialog__title">{t("Save to album")}</AlertDialog.Title>
            <div className="album-dialog__body">
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
                          aria-pressed={mediaIds.every((_, index) =>
                            albumQueries[index]?.data?.find((item) => item.id === album.id)?.containsMedia,
                          )}
                          disabled={pendingId !== null}
                          aria-busy={pendingId === album.id || undefined}
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
                            {t("{count} of {total} saved", {
                              count: mediaIds.filter((_, index) =>
                                albumQueries[index]?.data?.find((item) => item.id === album.id)?.containsMedia,
                              ).length,
                              total: mediaIds.length,
                            })}
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
                    disabled={creating}
                  />
                  <Button type="submit" variant="secondary" busy={creating} disabled={!name.trim()}>{t("Create")}</Button>
                </form>
            </div>
            <footer className="confirmation-dialog__actions">
              <button type="button" className="btn btn--primary" onClick={onClose}>{t("Done")}</button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
