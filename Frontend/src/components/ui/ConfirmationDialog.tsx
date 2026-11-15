import { Button } from "./Button";
import { CustomDialog as Dialog } from "./CustomDialog";
import { useConfirmationDialog, type ConfirmationDialogProps } from "./useConfirmationDialog";

export function ConfirmationDialog(props: ConfirmationDialogProps) {
  const { title, confirmLabel, children, danger = false, cancelPrompt, portalContainer } = props;
  const { t, popupRef, busy, dialogProps, dismiss, viewportStyle, confirm } = useConfirmationDialog(props);
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
