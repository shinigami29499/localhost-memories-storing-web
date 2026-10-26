import { useRef, useState } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import { X } from "@/components/animate-ui/icons/x";
import type { ReactNode } from "react";
import { ApiError } from "../../services/api";
import { Button } from "./Button";
import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";

interface Props {
  title: string;
  children: ReactNode;
  danger?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmationDialog({ title, children, danger, onConfirm, onClose }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = () => {
    if (!pending.current) onClose();
  };

  const confirm = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete this action. Please retry.");
      pending.current = false;
      setBusy(false);
      return;
    }
    onClose();
  };

  return (
    <AlertDialog.Root defaultOpen onOpenChange={(open) => { if (!open) cancel(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="alert-dialog-backdrop" />
        <AlertDialog.Viewport className="confirmation-dialog-viewport">
          <AlertDialog.Popup className="delete-post-dialog">
            <AnimateIcon animateOnHover asChild>
              <AlertDialog.Close asChild>
                <button type="button" className="btn btn--ghost post-card__delete delete-post-dialog__close" aria-label="Cancel action" title="Cancel action" disabled={busy} onClick={cancel}>
                  <X size={20} aria-hidden="true" />
                </button>
              </AlertDialog.Close>
            </AnimateIcon>
            <AlertDialog.Title asChild>
              <h2>{title}</h2>
            </AlertDialog.Title>
            <AlertDialog.Description asChild>
              <div>
                <fieldset className="confirmation-dialog__message" disabled={busy}>{children}</fieldset>
              </div>
            </AlertDialog.Description>
            {error ? <p className="delete-post-dialog__error" role="alert">{error}</p> : null}
            <div className="delete-post-dialog__actions">
              <Button type="button" variant={danger ? "danger" : "primary"} busy={busy} onClick={() => void confirm()}>Confirm</Button>
              <button ref={cancelRef} type="button" className="btn btn--secondary" disabled={busy} onClick={cancel}>Cancel</button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
