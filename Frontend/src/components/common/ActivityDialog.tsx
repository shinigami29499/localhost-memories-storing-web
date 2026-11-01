import type { ReactNode } from "react";
import { CustomDialog as AlertDialog, useCustomDialog } from "../ui/CustomDialog";
import { useLocale } from "../../context/LocaleContext";
import "../../features/uploads/components/UploadActivityHeatmap.css";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function ActivityDialog({ title, onClose, children }: Props) {
  const { t } = useLocale();
  const { dialogProps, dismiss } = useCustomDialog(onClose);

  return (
    <AlertDialog.Root {...dialogProps}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" />
        <AlertDialog.Viewport className="confirmation-dialog-viewport">
          <AlertDialog.Popup className="confirmation-dialog upload-activity-dialog">
            <AlertDialog.Title className="confirmation-dialog__title">{t(title)}</AlertDialog.Title>
            <p className="upload-activity-dialog__hint">{t("The heatmap shows 36 weeks on desktop and 12 weeks on mobile.")}</p>
            <div className="upload-activity-dialog__body">{children}</div>
            <footer className="confirmation-dialog__actions">
              <button type="button" className="btn btn--danger" onClick={dismiss}>{t("Close")}</button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
