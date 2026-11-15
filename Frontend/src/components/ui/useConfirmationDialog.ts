import { useRef, useState, type ReactNode } from "react";
import { ApiError } from "../../services/api";
import { showToast } from "./Toast";
import { useCustomDialog } from "./CustomDialog";
import { useLocale } from "../../context/LocaleContext";
import { useDialogViewportStyle } from "../../hooks/useDialogViewportStyle";

export interface ConfirmationDialogProps {
  title: string;
  confirmLabel: string;
  children: ReactNode;
  danger?: boolean;
  cancelPrompt?: string;
  portalContainer?: HTMLElement | null;
  onConfirm: () => Promise<void | (() => void)>;
  onClose: () => void;
}

export function useConfirmationDialog({ onConfirm, onClose }: ConfirmationDialogProps) {
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

  return { t, popupRef, busy, dialogProps, dismiss, viewportStyle, confirm };
}
