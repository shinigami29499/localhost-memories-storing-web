import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { ApiError } from "../../services/api";
import { Button } from "./Button";
import { showToast } from "./Toast";
import { CustomDialog as Dialog, useCustomDialog } from "./CustomDialog";
import { useLocale } from "../../context/LocaleContext";
import { useDialogViewportStyle } from "../../hooks/useDialogViewportStyle";

interface Props {
  title: string;
  children: ReactNode;
  danger?: boolean;
  onConfirm: () => Promise<void | (() => void)>;
  onClose: () => void;
}

export function ConfirmationDialog({ title, children, onConfirm, onClose }: Props) {
  const { t } = useLocale();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const { dialogProps, close, dismiss } = useCustomDialog(onClose, { blocked: busy });
  const viewportStyle = useDialogViewportStyle();

  const confirm = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const afterClose = await onConfirm();
      close(afterClose ?? undefined);
    } catch (err) {
      showToast.error(err instanceof ApiError ? err.message : t("Could not complete this action. Please retry."));
      pending.current = false;
      setBusy(false);
      return;
    }
  };

  return (
    <Dialog.Root {...dialogProps}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirmation-dialog-backdrop" />
        <Dialog.Viewport className="confirmation-dialog-viewport" style={viewportStyle}>
          <Dialog.Popup className="confirmation-dialog" role="alertdialog" initialFocus={cancelRef}>
            <Dialog.Title className="confirmation-dialog__title">{t(title)}</Dialog.Title>
            <Dialog.Description render={<div />}>
              <fieldset className="confirmation-dialog__message" disabled={busy}>{children}</fieldset>
            </Dialog.Description>
            <footer className="confirmation-dialog__actions">
              <Button type="button" variant="primary" busy={busy} onClick={() => void confirm()}>{t("Confirm")}</Button>
              <button ref={cancelRef} type="button" className="btn btn--danger" disabled={busy} onClick={dismiss}>{t("Cancel")}</button>
            </footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
