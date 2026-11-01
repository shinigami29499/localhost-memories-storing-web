import { useState } from "react";
import { CustomDialog as Dialog, useCustomDialog } from "../../../components/ui/CustomDialog";
import { Button } from "../../../components/ui/Button";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { ALBUM_CAPTION_MAX_LENGTH } from "../types";

interface Props {
  caption: string;
  onSave: (caption: string) => Promise<void>;
  onClose: () => void;
}

export function AlbumCaptionDialog({ caption: initialCaption, onSave, onClose }: Props) {
  const { t } = useLocale();
  const [caption, setCaption] = useState(initialCaption);
  const [busy, setBusy] = useState(false);
  const { dialogProps, close, dismiss } = useCustomDialog(onClose, { blocked: busy });

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onSave(caption.trim());
      close();
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not update album caption."));
      setBusy(false);
    }
  };

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
            <footer className="album-caption-dialog__actions">
              <Button type="button" busy={busy} onClick={() => void save()}>{t("Save caption")}</Button>
              <button type="button" className="btn btn--danger" disabled={busy} onClick={dismiss}>{t("Cancel")}</button>
            </footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
