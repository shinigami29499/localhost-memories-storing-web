import { CustomDialog as AlertDialog } from "../../../components/ui/CustomDialog";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Button } from "../../../components/ui/Button";
import { ConfirmationDialog } from "../../../components/ui/ConfirmationDialog";
import { Spinner, ErrorState } from "../../../components/ui/Status";
import { mediaPreviewUrl } from "../../../utils/media";
import { ALBUM_NAME_MAX_LENGTH } from "../types";
import { AlbumSearchInput } from "./AlbumSearchInput";
import { useSaveToAlbumDialog, type SaveToAlbumDialogProps } from "./useSaveToAlbumDialog";

/** Lists the viewer's albums with save state for selected media, and creates albums inline. */
export function SaveToAlbumDialog(props: SaveToAlbumDialogProps) {
  const { mediaIds, portalContainer } = props;
  const { t, search, setSearch, albumsQuery, membership, savedMediaIds, pendingId, name, setName, creating, removal, setRemoval, busy, blocked, dialogProps, dismiss, toggle, create, items, isPending, loadError } = useSaveToAlbumDialog(props);
  return (
    <AlertDialog.Root {...dialogProps}>
      <AlertDialog.Portal container={portalContainer}>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" />
        <AlertDialog.Viewport className="confirmation-dialog-viewport">
          <AlertDialog.Popup className="confirmation-dialog album-dialog">
            <AlertDialog.Title className="confirmation-dialog__title">{t("Save to album")}</AlertDialog.Title>
            <div className="album-dialog__body">
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
                  <Button type="submit" className="dialog-action dialog-action--normal" busy={creating} disabled={!name.trim() || blocked}>{t("Create")}</Button>
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
          confirmLabel="Delete from album"
          danger
          portalContainer={portalContainer}
          onClose={() => setRemoval(null)}
          onConfirm={async () => { await toggle(removal.album, removal.mediaIds); }}
        >
          <p>{t("Delete {count} media items from “{name}”?", {
            count: removal.mediaIds.length,
            name: removal.album.name,
          })}</p>
          <p>{t("Files owned by the album owner will be permanently deleted from storage and every album. Other files are removed from this album.")}</p>
        </ConfirmationDialog>
      )}
    </AlertDialog.Root>
  );
}
