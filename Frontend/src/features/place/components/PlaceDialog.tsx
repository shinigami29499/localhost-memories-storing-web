import { useState, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { XIcon } from "../../../components/animate-ui/icons/x";
import { useLocale } from "../../../context/LocaleContext";

interface Props {
  title: string;
  icon?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  hideClose?: boolean;
  className?: string;
}

export function PlaceDialog({ title, icon, subtitle, children, onClose, closeDisabled = false, hideClose = false, className = "" }: Props) {
  const { t } = useLocale();
  const [open, setOpen] = useState(true);
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && closeDisabled) return;
    setOpen(nextOpen);
    if (!nextOpen) onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirmation-dialog-backdrop" />
        <Dialog.Viewport className="confirmation-dialog-viewport">
          <Dialog.Popup className={`place__dialog ${className}`}>
            <header className="place__dialog-header">
              {icon}
              <div className="place__dialog-heading">
                <Dialog.Title className="place__dialog-title">{title}</Dialog.Title>
                {subtitle && <p className="place__dialog-subtitle">{subtitle}</p>}
              </div>
              {!hideClose && <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                <Dialog.Close
                  className="place__dialog-close"
                  aria-label={t("Cancel action")}
                  title={t("Cancel action")}
                  disabled={closeDisabled}
                >
                  <XIcon size={20} aria-hidden="true" />
                </Dialog.Close>
              </AnimateIcon>}
            </header>
            <div className="place__dialog-body">{children}</div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
