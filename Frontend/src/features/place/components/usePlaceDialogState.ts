import { useState } from "react";
import { useLocale } from "../../../context/LocaleContext";
import { useAnimationStore } from "../../../store/animationStore";
import { useDialogViewportStyle } from "../../../hooks/useDialogViewportStyle";

export function usePlaceDialogState(closeDisabled: boolean) {
  const { t } = useLocale();
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const [open, setOpen] = useState(true);
  const viewportStyle = useDialogViewportStyle();
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && closeDisabled) return;
    setOpen(nextOpen);
  };
  return { t, animationsEnabled, open, viewportStyle, handleOpenChange };
}
