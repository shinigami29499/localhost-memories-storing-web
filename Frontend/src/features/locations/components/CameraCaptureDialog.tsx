import { Button, CustomDialog } from "../../../components/ui";
import { useCameraCaptureController } from "./useCameraCaptureController";

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCaptureDialog({ onCapture, onClose }: Props) {
  const { t, dialogProps, close, dismiss, videoRef, stream, photo, previewUrl, error, capture } = useCameraCaptureController(onClose);
  return (
    <CustomDialog.Root {...dialogProps}>
      <CustomDialog.Portal>
        <CustomDialog.Backdrop className="confirmation-dialog-backdrop" />
        <CustomDialog.Viewport className="confirmation-dialog-viewport">
          <CustomDialog.Popup className="confirmation-dialog locations-camera-dialog">
            <CustomDialog.Title className="confirmation-dialog__title">{t(photo ? "Review photo" : "Capture photo")}</CustomDialog.Title>
            <div className="locations-camera-dialog__preview">
              {previewUrl ? <img src={previewUrl} alt={t("Captured photo preview")} /> : <video ref={videoRef} autoPlay playsInline muted />}
            </div>
            {error ? <p className="locations-camera-dialog__error" role="alert">{error}</p> : null}
            <footer className="confirmation-dialog__actions dialog-actions">
              <Button type="button" variant="danger" className="dialog-action dialog-action--danger" onClick={dismiss}>{t("Cancel")}</Button>
              {photo ? <Button type="button" className="dialog-action dialog-action--normal" onClick={() => close(() => onCapture(photo))}>{t("Upload photo")}</Button>
                : <Button type="button" className="dialog-action dialog-action--normal" disabled={!stream} onClick={() => void capture()}>{t("Capture")}</Button>}
            </footer>
          </CustomDialog.Popup>
        </CustomDialog.Viewport>
      </CustomDialog.Portal>
    </CustomDialog.Root>
  );
}
