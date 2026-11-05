import { useState, type FormEvent } from "react";
import { CustomDialog as AlertDialog, useCustomDialog } from "../../../components/ui/CustomDialog";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Button } from "../../../components/ui/Button";
import { ConfirmationDialog } from "../../../components/ui/ConfirmationDialog";
import { Spinner, ErrorState } from "../../../components/ui/Status";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { mediaPreviewUrl } from "../../../utils/media";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useAlbumMembership, useInfiniteAlbums, useInvalidateAlbums } from "../hooks/useAlbums";
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

  return (
    <AlertDialog.Root {...dialogProps}>
      <AlertDialog.Portal container={portalContainer}>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" />
        <AlertDialog.Viewport className="confirmation-dialog-viewport">
          <AlertDialog.Popup className="confirmation-dialog album-dialog">
            <AlertDialog.Title className="confirmation-dialog__title">{t("Save to album")}</AlertDialog.Title>
            <div className="album-dialog__body">
                <input type="search" value={search} maxLength={120} onChange={(event) => setSearch(event.target.value)}
                  aria-label={t("Search albums")} placeholder={t("Search albums")} />
                {isPending ? <Spinner label={t("Loading albums…")} /> : loadError ? (
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
                          aria-pressed={savedMediaIds(album).length === mediaIds.length}
                          disabled={busy}
                          aria-busy={pendingId === album.id || undefined}
                          onClick={() => {
                            if (blocked) return;
                            const saved = savedMediaIds(album);
                            if (saved.length === mediaIds.length) setRemoval({ album, mediaIds: saved });
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
                            {t("{count} of {total} saved", {
                              count: savedMediaIds(album).length,
                              total: mediaIds.length,
                            })}
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
                  <button type="button" className="btn btn--secondary" disabled={blocked || albumsQuery.isFetchingNextPage}
                    onClick={() => void albumsQuery.fetchNextPage()}>
                    {t(albumsQuery.isFetchingNextPage ? "Loading albums…" : "Load more")}
                  </button>
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
                  <Button type="submit" variant="secondary" busy={creating} disabled={!name.trim() || blocked}>{t("Create")}</Button>
                </form>
            </div>
            <footer className="confirmation-dialog__actions">
              <button type="button" className="btn btn--primary" disabled={blocked} onClick={dismiss}>{t("Done")}</button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
      {removal && (
        <ConfirmationDialog
          title="Remove selected media from album?"
          confirmLabel="Remove from album"
          danger
          portalContainer={portalContainer}
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
