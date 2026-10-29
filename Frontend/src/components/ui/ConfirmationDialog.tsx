import { useRef, useState } from "react";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { X } from "@/components/animate-ui/icons/x";
import type { ReactNode } from "react";
import { ApiError } from "../../services/api";
import { Button } from "./Button";
import { showToast } from "./Toast";
import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";
import { useLocale } from "../../context/LocaleContext";

interface Props {
  title: string;
  children: ReactNode;
  danger?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmationDialog({ title, children, danger, onConfirm, onClose }: Props) {
  const { t } = useLocale();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);

  const cancel = () => {
    if (!pending.current) onClose();
  };

  const confirm = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await onConfirm();
    } catch (err) {
      showToast.error(err instanceof ApiError ? err.message : t("Could not complete this action. Please retry."));
      pending.current = false;
      setBusy(false);
      return;
    }
    onClose();
  };

  return (
    <AlertDialog.Root defaultOpen onOpenChange={(open) => { if (!open) cancel(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" onClick={cancel} />
        <AlertDialog.Viewport
          className="confirmation-dialog-viewport"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancel();
          }}
        >
          <AlertDialog.Popup from="top" className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button type="button" className="btn btn--ghost confirmation-dialog__close" aria-label={t("Cancel action")} title={t("Cancel action")} disabled={busy} onClick={cancel}>
                <X size={20} aria-hidden="true" />
              </button>
            </AnimateIcon>
            <AlertDialog.Title asChild>
              <h2 className="confirmation-dialog__title">{t(title)}</h2>
            </AlertDialog.Title>
            <AlertDialog.Description asChild>
              <div>
                <fieldset className="confirmation-dialog__message" disabled={busy}>{children}</fieldset>
              </div>
            </AlertDialog.Description>
            <footer className="confirmation-dialog__actions">
              <button ref={cancelRef} type="button" className="btn btn--secondary" disabled={busy} onClick={cancel}>{t("Cancel")}</button>
              <Button type="button" variant={danger ? "danger" : "primary"} busy={busy} onClick={() => void confirm()}>{t("Continue")}</Button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
