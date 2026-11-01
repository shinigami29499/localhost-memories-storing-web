import { useCallback, useRef, useState, type ComponentProps } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { useAnimationStore } from "../../store/animationStore";

interface DialogOptions {
  blocked?: boolean;
  dismissible?: boolean;
  defaultOpen?: boolean;
}

export function useCustomDialog(
  onClose: () => void,
  { blocked = false, dismissible = true, defaultOpen = true }: DialogOptions = {},
) {
  const [open, setOpen] = useState(defaultOpen);
  const closing = useRef(false);
  const afterClose = useRef<(() => void) | undefined>(undefined);

  const close = useCallback((action?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    afterClose.current = action;
    setOpen(false);
  }, []);

  const dismiss = () => {
    if (!blocked && dismissible) close();
  };

  const openDialog = useCallback(() => {
    closing.current = false;
    afterClose.current = undefined;
    setOpen(true);
  }, []);

  return {
    close,
    dismiss,
    openDialog,
    dialogProps: {
      open,
      onOpenChange: (nextOpen: boolean) => {
        if (!nextOpen) dismiss();
      },
      onOpenChangeComplete: (nextOpen: boolean) => {
        if (nextOpen || !closing.current) return;
        closing.current = false;
        const action = afterClose.current;
        afterClose.current = undefined;
        onClose();
        action?.();
      },
    },
  };
}

function Popup({ className, ...props }: ComponentProps<typeof BaseDialog.Popup>) {
  const animated = useAnimationStore((state) => state.enabled);
  return (
    <BaseDialog.Popup
      {...props}
      className={(state) => [
        "custom-dialog",
        animated ? "custom-dialog--animated" : "",
        typeof className === "function" ? className(state) : className,
      ].filter(Boolean).join(" ")}
    />
  );
}

function Backdrop({ className, ...props }: ComponentProps<typeof BaseDialog.Backdrop>) {
  const animated = useAnimationStore((state) => state.enabled);
  return (
    <BaseDialog.Backdrop
      {...props}
      className={(state) => [
        animated ? "custom-dialog-backdrop--animated" : "",
        typeof className === "function" ? className(state) : className,
      ].filter(Boolean).join(" ")}
    />
  );
}

export const CustomDialog = { ...BaseDialog, Popup, Backdrop };
