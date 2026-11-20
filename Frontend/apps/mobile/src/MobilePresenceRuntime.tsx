import "./mobile-session-dialog.css";
import { CustomDialog as AlertDialog } from "@/components/ui/CustomDialog";
import { Button } from "@/components/ui/Button";
import { usePresenceRuntime } from "@/features/users/components/usePresenceRuntime";

export function MobilePresenceRuntime() {
  const { accountChange, dialogProps, reload, t } = usePresenceRuntime();
  if (!accountChange) return null;

  return (
    <AlertDialog.Root {...dialogProps}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="mobile-session-dialog-backdrop" />
        <AlertDialog.Viewport className="mobile-session-dialog-viewport">
          <AlertDialog.Popup className="mobile-session-dialog" role="alertdialog">
            <AlertDialog.Title className="mobile-session-dialog__title">
              {t(accountChange === "disabled" ? "Account paused" : "Role updated")}
            </AlertDialog.Title>
            <AlertDialog.Description className="mobile-session-dialog__message">
              {t(accountChange === "disabled"
                ? "Your account has been paused. Reload to continue."
                : "Your role has been updated. Reload and sign in again.")}
            </AlertDialog.Description>
            <footer className="mobile-session-dialog__actions">
              <Button type="button" className="mobile-session-dialog__button" onClick={reload}>{t("Reload")}</Button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
