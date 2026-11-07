import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { PlaceDialog } from "../../place/components/PlaceDialog";
import { Button } from "../../../components/ui/Button";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { PhotoPicker } from "../../media/components/PhotoPicker";
import { usePreviewDrafts } from "../../media/hooks/usePreviewDrafts";
import { previewService } from "../../media/services/previewService";
import { mediaPreviewUrl } from "../../../utils/media";
import type { Album, UpdateAlbumInput } from "../types";
import { ALBUM_NAME_MAX_LENGTH } from "../types";

interface Props {
  /** Existing album to edit; omit to create a new one. */
  album?: Album;
  onSubmit: (input: UpdateAlbumInput) => Promise<void | (() => void)>;
  onClose: () => void;
  onDelete?: () => Promise<void | (() => void)>;
}

/** Create or edit an album: name, visibility, and (when editing) the preview image. */
export function AlbumFormDialog({ album, onSubmit, onClose, onDelete }: Props) {
  const { t, language } = useLocale();
  const editing = Boolean(album);
  const [name, setName] = useState(album?.name ?? "");
  const [isPublic, setIsPublic] = useState(album?.isPublic ?? false);
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(album?.customPreviewMediaId ?? null);
  const displayedPreviewId = previewMediaId ?? album?.previewMediaId;
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const pending = useRef(false);
  const closeDialog = () => {
    if (!busy && !isPhotoPickerOpen) onClose();
  };
  const { register: registerDraft, retain: retainDrafts } = usePreviewDrafts();
  const selectedImage = useQuery({
    queryKey: ["picker-image", previewMediaId],
    queryFn: () => previewService.getImage(previewMediaId!),
    enabled: Boolean(previewMediaId),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy || isPhotoPickerOpen || confirmingDelete || pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const afterClose = await onSubmit({ name: trimmed, isPublic, previewMediaId });
      onClose();
      afterClose?.();
    } catch (err) {
      showToast.error(err instanceof ApiError ? err.message : t("Could not complete this action. Please retry."));
      pending.current = false;
      setBusy(false);
      return;
    }
  };

  const confirmDelete = async () => {
    if (!onDelete || pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const afterClose = await onDelete();
      onClose();
      afterClose?.();
    } catch (err) {
      showToast.error(err instanceof ApiError ? err.message : t("Could not complete this action. Please retry."));
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <PlaceDialog title={t(editing ? "Edit album" : "New album")} onClose={closeDialog} closeDisabled={busy || isPhotoPickerOpen} className="album-dialog"
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
                  : selectedImage.data?.originalFilename ?? t("Loading images…") : t("Default (first image)")}
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
            {t("The album “{name}” will be deleted. Saved media stay in your gallery.", { name: album.name })}
          </p>}
        </footer>
      </form>
      {isPhotoPickerOpen ? <PhotoPicker
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
    </PlaceDialog>
  );
}
