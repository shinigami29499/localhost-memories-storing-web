import { useEffect, useRef, useState } from "react";
import { Button, CustomDialog, useCustomDialog } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { showToast } from "../../../components/ui/Toast";

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCaptureDialog({ onCapture, onClose }: Props) {
  const { t } = useLocale();
  const { dialogProps, close, dismiss } = useCustomDialog(onClose);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    let active = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t("Camera access is unavailable. Use HTTPS and a supported browser."));
      return;
    }
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((cameraStream) => {
        if (!active) {
          cameraStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = cameraStream;
        setStream(cameraStream);
      })
      .catch((failure: unknown) => {
        if (!active) return;
        const message = failure instanceof DOMException && (failure.name === "NotAllowedError" || failure.name === "SecurityError")
          ? t("Camera access failed. Allow camera access in your browser or device settings.")
          : t("Camera permission was denied or the camera is unavailable.");
        setError(message);
        showToast.error(message);
      });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [t]);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    videoRef.current.srcObject = stream;
    void videoRef.current.play().catch(() => setError(t("Could not start the camera preview.")));
  }, [stream, t]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError(t("Could not capture this photo."));
      return;
    }
    context.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setError(t("Could not capture this photo."));
      return;
    }
    setPhoto(new File([blob], `scenery-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  };

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
