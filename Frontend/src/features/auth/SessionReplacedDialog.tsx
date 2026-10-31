import { useEffect, useState } from "react";
import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "../../context/LocaleContext";
import { sessionReplacedEvent } from "./sessionReplacement";

export function SessionReplacedDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useLocale();
  useEffect(() => {
    const onReplaced = () => { queryClient.clear(); setOpen(true); };
    window.addEventListener(sessionReplacedEvent, onReplaced);
    return () => window.removeEventListener(sessionReplacedEvent, onReplaced);
  }, [queryClient]);
  if (!open) return null;
  return (
    <AlertDialog.Root open>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" />
        <AlertDialog.Viewport className="confirmation-dialog-viewport">
          <AlertDialog.Popup className="confirmation-dialog">
            <AlertDialog.Title className="confirmation-dialog__title">{t("Signed out")}</AlertDialog.Title>
            <AlertDialog.Description className="confirmation-dialog__message">
              {t("Your account was signed in on another device. You have been signed out.")}
            </AlertDialog.Description>
            <footer className="confirmation-dialog__actions">
              <button type="button" className="btn btn--primary" onClick={() => setOpen(false)}>{t("OK")}</button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
