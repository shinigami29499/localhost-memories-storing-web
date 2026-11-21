import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Button } from "@/components/ui/Button";
import { ALBUM_NAME_MAX_LENGTH } from "@/features/albums/types";
import { MobilePhotoPicker } from "../media/MobilePhotoPicker";
import { MobilePlaceDialog } from "../places/MobilePlaceDialog";
import "../places/mobile-place-dialog.css";
import { mediaPreviewUrl } from "@/utils/media";

import { useAlbumFormDialog,type AlbumFormDialogProps } from "@/features/albums/components/useAlbumFormDialog";

export function MobileAlbumFormDialog(props: AlbumFormDialogProps) {
  const { album, onDelete } = props;
  const { t, language, editing, name, setName, isPublic, setIsPublic, previewMediaId, setPreviewMediaId, displayedPreviewId, isPhotoPickerOpen, setIsPhotoPickerOpen, busy, confirmingDelete, setConfirmingDelete, closeDialog, registerDraft, retainDrafts, selectedImage, submit, confirmDelete } = useAlbumFormDialog(props);
  return (
    <MobilePlaceDialog title={t(editing ? "Edit album" : "New album")} onClose={closeDialog} closeDisabled={busy || isPhotoPickerOpen} className="album-dialog"
      subtitle={album ? t("by {owner}", { owner: album.owner.username }) : undefined}
      subtitleSecondLine={album ? `${t("Created")}: ${new Date(album.createdAt).toLocaleString(language, { dateStyle: "medium", timeStyle: "short" })}` : undefined}
      icon={album ? <span className="album-form__preview" aria-hidden="true">
        {displayedPreviewId ? <img src={mediaPreviewUrl(displayedPreviewId)} alt="" /> : <Bookmark size={24} />}
      </span> : undefined}>
      <form className="album-form place__form" onSubmit={(event) => void submit(event)}>
        <fieldset className="album-form__fields" disabled={busy || isPhotoPickerOpen}>
          <label className="album-form__field">
            <span>{t("Name")}</span>
            <input value={name} onChange={(event) => setName(event.target.value)}
              maxLength={ALBUM_NAME_MAX_LENGTH} required autoFocus />
          </label>
          {editing ? (
            <div className="album-form__field">
              <span>{t("Preview image")}</span>
              <Button type="button" className="dialog-action dialog-action--normal album-form__choose-photos" onClick={() => setIsPhotoPickerOpen(true)}>
                {t("Choose photos")}
              </Button>
              <small className="album-form__hint">
                {previewMediaId ? selectedImage.isError ? t("Could not load media.")
                  : selectedImage.data?.originalFilename ?? t("Loading images...") : t("Default (first image)")}
              </small>
            </div>
          ) : null}
          <label className="album-form__toggle">
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
            <span>
              <strong>{t("Public album")}</strong>
              <small>{t("Anyone signed in can view a public album. Private albums are only visible to you.")}</small>
            </span>
          </label>
        </fieldset>
        <footer className="place__form-actions">
          <div className="place__form-actions-primary dialog-actions">
            {confirmingDelete ? <>
              <Button type="button" className="dialog-action dialog-action--danger" variant="danger" autoFocus disabled={busy}
                onClick={() => setConfirmingDelete(false)}>{t("Cancel")}</Button>
              <Button type="button" className="dialog-action dialog-action--danger-confirm" variant="danger" busy={busy}
                onClick={() => void confirmDelete()}>{t("Delete album")}</Button>
            </> : <>
              <Button type="button" className="dialog-action dialog-action--danger album-form__cancel" variant="danger" disabled={busy || isPhotoPickerOpen}
                onClick={editing && onDelete ? () => setConfirmingDelete(true) : closeDialog}>
                {t(editing && onDelete ? "Delete" : "Cancel")}
              </Button>
              <Button type="submit" className="dialog-action dialog-action--normal album-form__save" busy={busy} disabled={!name.trim() || isPhotoPickerOpen}>
                {t(editing ? "Save changes" : "Create")}
              </Button>
            </>}
          </div>
          {confirmingDelete && album && <p className="dialog-actions__note">
            {t("The album “{name}” will be deleted. Files owned by the album owner will be permanently deleted from storage and every album.", { name: album.name })}
          </p>}
        </footer>
      </form>
      {isPhotoPickerOpen ? <MobilePhotoPicker
        selectedId={previewMediaId ?? album?.previewMediaId ?? null}
        onConfirm={(image) => {
          setPreviewMediaId(image?.id ?? null);
          retainDrafts(image ? [image.id] : []);
        }}
        onUploadedPreview={registerDraft}
        onClose={() => setIsPhotoPickerOpen(false)}
        backdropClassName="album-photo-picker-backdrop"
        viewportClassName="album-photo-picker-viewport"
      /> : null}
    </MobilePlaceDialog>
  );
}
