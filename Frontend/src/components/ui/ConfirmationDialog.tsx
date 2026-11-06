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
  confirmLabel: string;
  children: ReactNode;
  danger?: boolean;
  cancelPrompt?: string;
  portalContainer?: HTMLElement | null;
  onConfirm: () => Promise<void | (() => void)>;
  onClose: () => void;
}

export function ConfirmationDialog({ title, confirmLabel, children, danger = false, cancelPrompt, onConfirm, onClose, portalContainer }: Props) {
  const { t } = useLocale();
  const popupRef = useRef<HTMLDivElement>(null);
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
      <Dialog.Portal container={portalContainer} style={portalContainer ? { position: "absolute", inset: 0 } : undefined}>
        <Dialog.Backdrop className="confirmation-dialog-backdrop" />
        <Dialog.Viewport className="confirmation-dialog-viewport" style={viewportStyle}>
          <Dialog.Popup
            ref={popupRef}
            className="confirmation-dialog"
            role="alertdialog"
            initialFocus={() => cancelPrompt
              ? popupRef.current?.querySelector<HTMLButtonElement>(".dialog-action--danger-confirm") ?? popupRef.current
              : popupRef.current?.querySelector<HTMLButtonElement>(".confirmation-dialog__cancel") ?? popupRef.current}
          >
            <Dialog.Title className="confirmation-dialog__title">{t(title)}</Dialog.Title>
            <Dialog.Description render={<div />}>
              <fieldset className="confirmation-dialog__message" disabled={busy}>{children}</fieldset>
            </Dialog.Description>
            <footer className={`confirmation-dialog__actions dialog-actions${danger ? " confirmation-dialog__actions--danger" : ""}${cancelPrompt ? " dialog-actions--confirm" : ""}`}>
              {cancelPrompt
                ? <span className="dialog-actions__prompt">{t(cancelPrompt)}</span>
                : <Button type="button" variant="danger" className="dialog-action dialog-action--danger confirmation-dialog__cancel" disabled={busy} onClick={dismiss}>{t("Cancel")}</Button>}
              <Button type="button" className={`dialog-action ${danger ? "dialog-action--danger-confirm" : "dialog-action--normal"} confirmation-dialog__confirm${danger ? " confirmation-dialog__confirm--danger" : ""}`} variant={danger ? "danger" : "primary"} busy={busy} onClick={() => void confirm()}>{t(confirmLabel)}</Button>
            </footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
