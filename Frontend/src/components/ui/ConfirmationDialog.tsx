import { useEffect, useId, useRef, useState } from "react";
import { X } from "@/components/animate-ui/icons/x";
import type { ReactNode } from "react";
import { ApiError } from "../../services/api";
import { Button } from "./Button";

interface Props {
  title: string;
  children: ReactNode;
  danger?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmationDialog({ title, children, danger, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const warningId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog?.showModal();
    cancelRef.current?.focus();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => {
    setError(null);
    cancelRef.current?.focus();
  }, [title]);

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
    <dialog
      ref={dialogRef}
      className="delete-post-dialog"
      aria-labelledby={titleId}
      aria-describedby={warningId}
      aria-busy={busy}
      onCancel={(event) => { event.preventDefault(); cancel(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) cancel();
      }}
    >
      <button type="button" className="btn btn--ghost post-card__delete delete-post-dialog__close" aria-label="Cancel action" title="Cancel action" disabled={busy} onClick={cancel}>
        <X size={20} aria-hidden="true" />
      </button>
      <h2 id={titleId}>{title}</h2>
      <div id={warningId}>
        <fieldset className="confirmation-dialog__message" disabled={busy}>{children}</fieldset>
      </div>
      {error ? <p className="delete-post-dialog__error" role="alert">{error}</p> : null}
      <div className="delete-post-dialog__actions">
        <Button type="button" variant={danger ? "danger" : "primary"} busy={busy} onClick={() => void confirm()}>Confirm</Button>
        <button ref={cancelRef} type="button" className="btn btn--secondary" disabled={busy} onClick={cancel}>Cancel</button>
      </div>
    </dialog>
  );
}
