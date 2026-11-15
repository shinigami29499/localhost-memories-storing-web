import "./mobile-session-dialog.css";
import { CustomDialog as AlertDialog } from "@/components/ui/CustomDialog";
import { Button } from "@/components/ui/Button";
import { useSessionReplacedDialog } from "@/features/auth/useSessionReplacedDialog";

export function MobileSessionReplacedDialog() {
  const { dialogProps, close, t } = useSessionReplacedDialog();
  return (
    <AlertDialog.Root {...dialogProps}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="mobile-session-dialog-backdrop" />
        <AlertDialog.Viewport className="mobile-session-dialog-viewport">
          <AlertDialog.Popup className="mobile-session-dialog" role="alertdialog">
            <AlertDialog.Title className="mobile-session-dialog__title">{t("Signed out")}</AlertDialog.Title>
            <AlertDialog.Description className="mobile-session-dialog__message">
              {t("Your account was signed in on another device. You have been signed out.")}
            </AlertDialog.Description>
            <footer className="mobile-session-dialog__actions">
              <Button type="button" className="mobile-session-dialog__button" onClick={() => close()}>{t("OK")}</Button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
