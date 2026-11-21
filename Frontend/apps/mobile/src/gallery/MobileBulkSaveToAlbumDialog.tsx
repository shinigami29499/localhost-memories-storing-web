import { MobileConfirmationDialog } from "./MobileConfirmationDialog";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Button } from "@/components/ui/Button";
import { CustomDialog as AlertDialog } from "@/components/ui/CustomDialog";
import { ErrorState,Spinner } from "@/components/ui/Status";
import { MobileAlbumSearchInput } from "./MobileAlbumSearchInput";
import { ALBUM_NAME_MAX_LENGTH } from "@/features/albums/types";
import { mediaPreviewUrl } from "@/utils/media";

import { useBulkSaveToAlbumDialog,type BulkSaveToAlbumDialogProps } from "@/features/albums/components/useBulkSaveToAlbumDialog";

export function MobileBulkSaveToAlbumDialog(props: BulkSaveToAlbumDialogProps) {
  const { t, viewportStyle, selectedMediaIds, search, setSearch, albumsQuery, membership, pendingId, name, setName, creating, removal, setRemoval, savedMediaIds, toggle, create, items, isPending, loadError, busy, blocked, dialogProps, dismiss } = useBulkSaveToAlbumDialog(props);
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
              <MobileAlbumSearchInput value={search} onChange={setSearch} />
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
        <MobileConfirmationDialog
          title="Remove selected media from album?"
          confirmLabel="Delete from album"
          danger
          onClose={() => setRemoval(null)}
          onConfirm={async () => { await toggle(removal.album, removal.mediaIds); }}
        >
          <p>{t("Delete {count} media items from “{name}”?", {
            count: removal.mediaIds.length,
            name: removal.album.name,
          })}</p>
          <p>{t("Files owned by the album owner will be permanently deleted from storage and every album. Other files are removed from this album.")}</p>
        </MobileConfirmationDialog>
      )}
    </AlertDialog.Root>
  );
}
