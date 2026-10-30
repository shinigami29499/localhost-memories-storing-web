import { useState, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { XIcon } from "../../../components/animate-ui/icons/x";
import { useLocale } from "../../../context/LocaleContext";

interface Props {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
}

export function FoodPlaceDialog({ title, children, onClose, closeDisabled = false }: Props) {
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
          <Dialog.Popup className="food__dialog">
            <header className="food__dialog-header">
              <Dialog.Title className="food__dialog-title">{title}</Dialog.Title>
              <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                <Dialog.Close
                  className="food__dialog-close"
                  aria-label={t("Cancel action")}
                  title={t("Cancel action")}
                  disabled={closeDisabled}
                >
                  <XIcon size={20} aria-hidden="true" />
                </Dialog.Close>
              </AnimateIcon>
            </header>
            <div className="food__dialog-body">{children}</div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
