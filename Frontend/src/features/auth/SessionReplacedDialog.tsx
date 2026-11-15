import { CustomDialog as AlertDialog } from "../../components/ui/CustomDialog";
import { Button } from "../../components/ui/Button";
import { useSessionReplacedDialog } from "./useSessionReplacedDialog";

export function SessionReplacedDialog() {
  const { dialogProps, close, t } = useSessionReplacedDialog();
  return (
    <AlertDialog.Root {...dialogProps}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" />
        <AlertDialog.Viewport className="confirmation-dialog-viewport">
          <AlertDialog.Popup className="confirmation-dialog" role="alertdialog">
            <AlertDialog.Title className="confirmation-dialog__title">{t("Signed out")}</AlertDialog.Title>
            <AlertDialog.Description className="confirmation-dialog__message">
              {t("Your account was signed in on another device. You have been signed out.")}
            </AlertDialog.Description>
            <footer className="confirmation-dialog__actions dialog-actions">
              <Button type="button" className="dialog-action dialog-action--normal" onClick={() => close()}>{t("OK")}</Button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
