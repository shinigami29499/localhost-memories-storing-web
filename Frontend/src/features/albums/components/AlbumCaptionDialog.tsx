import { Button } from "../../../components/ui/Button";
import { CustomDialog as Dialog } from "../../../components/ui/CustomDialog";
import { ALBUM_CAPTION_MAX_LENGTH } from "../types";

import { useAlbumCaptionDialog,type AlbumCaptionDialogProps } from "./useAlbumCaptionDialog";

export function AlbumCaptionDialog(props: AlbumCaptionDialogProps) {
  const { t, caption, setCaption, busy, dialogProps, dismiss, save } = useAlbumCaptionDialog(props);
  return (
    <Dialog.Root {...dialogProps}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirmation-dialog-backdrop" />
        <Dialog.Viewport className="confirmation-dialog-viewport">
          <Dialog.Popup className="confirmation-dialog album-caption-dialog">
            <header className="album-caption-dialog__header">
              <Dialog.Title className="album-caption-dialog__title">{t("Album caption")}</Dialog.Title>
            </header>
            <div className="album-caption-dialog__content">
              <label className="album-caption-dialog__field">
                <span className="sr-only">{t("Album caption")}</span>
                <textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder={t("Write something...")}
                  maxLength={ALBUM_CAPTION_MAX_LENGTH}
                  rows={5}
                  autoFocus
                  disabled={busy}
                />
              </label>
            </div>
            <footer className="album-caption-dialog__actions dialog-actions">
              <Button type="button" variant="danger" className="dialog-action dialog-action--danger" disabled={busy} onClick={dismiss}>{t("Cancel")}</Button>
              <Button type="button" className="dialog-action dialog-action--normal" busy={busy} onClick={() => void save()}>{t("Save caption")}</Button>
            </footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
