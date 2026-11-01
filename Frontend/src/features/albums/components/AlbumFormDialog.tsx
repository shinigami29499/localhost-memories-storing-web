import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { CustomDialog as Dialog, useCustomDialog } from "../../../components/ui/CustomDialog";
import { Button } from "../../../components/ui/Button";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { PhotoPicker } from "../../media/components/PhotoPicker";
import { usePreviewDrafts } from "../../media/hooks/usePreviewDrafts";
import { previewService } from "../../media/services/previewService";
import type { Album, UpdateAlbumInput } from "../types";
import { ALBUM_NAME_MAX_LENGTH } from "../types";

interface Props {
  /** Existing album to edit; omit to create a new one. */
  album?: Album;
  onSubmit: (input: UpdateAlbumInput) => Promise<void | (() => void)>;
  onClose: () => void;
}

/** Create or edit an album: name, visibility, and (when editing) the preview image. */
export function AlbumFormDialog({ album, onSubmit, onClose }: Props) {
  const { t } = useLocale();
  const editing = Boolean(album);
  const [name, setName] = useState(album?.name ?? "");
  const [isPublic, setIsPublic] = useState(album?.isPublic ?? false);
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(album?.customPreviewMediaId ?? null);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { dialogProps, close, dismiss } = useCustomDialog(onClose, { blocked: busy || isPhotoPickerOpen });
  const { register: registerDraft, retain: retainDrafts } = usePreviewDrafts();
  const selectedImage = useQuery({
    queryKey: ["picker-image", previewMediaId],
    queryFn: () => previewService.getImage(previewMediaId!),
    enabled: Boolean(previewMediaId),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy || isPhotoPickerOpen) return;
    setBusy(true);
    try {
      const afterClose = await onSubmit({ name: trimmed, isPublic, previewMediaId });
      close(afterClose ?? undefined);
    } catch (err) {
      showToast.error(err instanceof ApiError ? err.message : t("Could not complete this action. Please retry."));
      setBusy(false);
      return;
    }
  };

  return (
    <Dialog.Root {...dialogProps}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirmation-dialog-backdrop" />
        <Dialog.Viewport className="confirmation-dialog-viewport">
          <Dialog.Popup className="confirmation-dialog album-dialog">
            <Dialog.Title className="confirmation-dialog__title">{t(editing ? "Edit album" : "New album")}</Dialog.Title>
            <form onSubmit={(event) => void submit(event)}>
              <fieldset className="album-dialog__body album-form" disabled={busy || isPhotoPickerOpen}>
                <label className="album-form__field">
                  <span>{t("Name")}</span>
                  <input value={name} onChange={(event) => setName(event.target.value)}
                    maxLength={ALBUM_NAME_MAX_LENGTH} required autoFocus />
                </label>
                <label className="album-form__toggle">
                  <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
                  <span>
                    <strong>{t("Public album")}</strong>
                    <small>{t("Anyone signed in can view a public album. Private albums are only visible to you.")}</small>
                  </span>
                </label>
                {editing ? (
                  <div className="album-form__field">
                    <span>{t("Preview image")}</span>
                    <Button type="button" className="album-form__choose-photos" onClick={() => setIsPhotoPickerOpen(true)}>
                      {t("Choose photos")}
                    </Button>
                    <small className="album-form__hint">
                      {previewMediaId ? selectedImage.isError ? t("Could not load media.")
                        : selectedImage.data?.originalFilename ?? t("Loading images…") : t("Default (first image)")}
                    </small>
                  </div>
                ) : null}
              </fieldset>
              <footer className="confirmation-dialog__actions">
                <Button type="submit" busy={busy} disabled={!name.trim() || isPhotoPickerOpen}>{t(editing ? "Save changes" : "Create")}</Button>
                <button type="button" className="btn btn--danger" disabled={busy || isPhotoPickerOpen} onClick={dismiss}>{t("Cancel")}</button>
              </footer>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
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
    </Dialog.Root>
  );
}
