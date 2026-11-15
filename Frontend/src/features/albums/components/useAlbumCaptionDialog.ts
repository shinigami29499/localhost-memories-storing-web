import { useState } from "react";
import { useCustomDialog } from "../../../components/ui/CustomDialog";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";

export interface AlbumCaptionDialogProps {
  caption: string;
  onSave: (caption: string) => Promise<void>;
  onClose: () => void;
}

export function useAlbumCaptionDialog({ caption: initialCaption, onSave, onClose }: AlbumCaptionDialogProps) {
  const { t } = useLocale();
  const [caption, setCaption] = useState(initialCaption);
  const [busy, setBusy] = useState(false);
  const { dialogProps, close, dismiss } = useCustomDialog(onClose, { blocked: busy });

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onSave(caption.trim());
      close();
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not update album caption."));
      setBusy(false);
    }
  };

  return { t, caption, setCaption, busy, dialogProps, dismiss, save };
}
