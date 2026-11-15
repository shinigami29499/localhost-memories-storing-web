import { CustomDialog as AlertDialog } from "../../../components/ui/CustomDialog";
import { Button } from "../../../components/ui/Button";
import { usePresenceRuntime } from "./usePresenceRuntime";

export function PresenceRuntime() {
  const { accountChange, dialogProps, reload, t } = usePresenceRuntime();
  if (!accountChange) return null;

  return (
    <AlertDialog.Root {...dialogProps}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" />
        <AlertDialog.Viewport className="confirmation-dialog-viewport">
          <AlertDialog.Popup className="confirmation-dialog" role="alertdialog">
            <AlertDialog.Title className="confirmation-dialog__title">
              {t(accountChange === "disabled" ? "Account disabled" : "Role updated")}
            </AlertDialog.Title>
            <AlertDialog.Description className="confirmation-dialog__message">
              {t(accountChange === "disabled"
                ? "Your account has been disabled. Reload to continue."
                : "Your role has been updated. Reload and sign in again.")}
            </AlertDialog.Description>
            <footer className="confirmation-dialog__actions dialog-actions">
              <Button type="button" className="dialog-action dialog-action--normal" onClick={reload}>{t("Reload")}</Button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
