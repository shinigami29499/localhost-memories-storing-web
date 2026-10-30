import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";
import { X } from "@/components/animate-ui/icons/x";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { useLocale } from "../../../context/LocaleContext";
import { UploadActivityHeatmap } from "./UploadActivityHeatmap";

interface Props {
  onClose: () => void;
}

export function UploadActivityDialog({ onClose }: Props) {
  const { t } = useLocale();

  return (
    <AlertDialog.Root defaultOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" onClick={onClose} />
        <AlertDialog.Viewport
          className="confirmation-dialog-viewport"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <AlertDialog.Popup
            from="top"
            className="confirmation-dialog upload-activity-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button
                type="button"
                className="btn btn--ghost confirmation-dialog__close"
                aria-label={t("Close")}
                title={t("Close")}
                onClick={onClose}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </AnimateIcon>
            <AlertDialog.Title className="confirmation-dialog__title">{t("Upload activity")}</AlertDialog.Title>
            <p className="upload-activity-dialog__hint">
              {t("The heatmap shows 36 weeks on desktop and 12 weeks on mobile.")}
            </p>
            <div className="upload-activity-dialog__body">
              <UploadActivityHeatmap />
            </div>
            <footer className="confirmation-dialog__actions">
              <button type="button" className="btn btn--secondary" onClick={onClose}>{t("Close")}</button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
