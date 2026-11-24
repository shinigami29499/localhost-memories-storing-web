import { useQuery } from "@tanstack/react-query";
import { useRef,useState,type FormEvent } from "react";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { usePreviewDrafts } from "../../media/hooks/usePreviewDrafts";
import { previewService } from "../../media/services/previewService";
import type { Album,UpdateAlbumInput } from "../types";

export interface AlbumFormDialogProps {
  /** Existing album to edit; omit to create a new one. */
  album?: Album;
  onSubmit: (input: UpdateAlbumInput) => Promise<void | (() => void)>;
  onClose: () => void;
  onDelete?: () => Promise<void | (() => void)>;
}

/** Create or edit an album: name, visibility, and (when editing) the preview image. */
export function useAlbumFormDialog({ album, onSubmit, onClose, onDelete }: AlbumFormDialogProps) {
  const { t, language } = useLocale();
  const editing = Boolean(album);
  const [name, setName] = useState(album?.name ?? "");
  const [isPublic, setIsPublic] = useState(album?.isPublic ?? false);
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(album?.customPreviewMediaId ?? null);
  const displayedPreviewId = previewMediaId ?? album?.previewMediaId;
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const pending = useRef(false);
  const closeDialog = () => {
    if (!busy && !isPhotoPickerOpen) onClose();
  };
  const { register: registerDraft, retain: retainDrafts } = usePreviewDrafts();
  const selectedImage = useQuery({
    queryKey: ["picker-image", previewMediaId],
    queryFn: ({ signal }) => previewService.getImage(previewMediaId!, signal),
    enabled: Boolean(previewMediaId),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy || isPhotoPickerOpen || confirmingDelete || pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const afterClose = await onSubmit({ name: trimmed, isPublic, previewMediaId });
      onClose();
      afterClose?.();
    } catch (err) {
      showToast.error(err instanceof ApiError ? err.message : t("Could not complete this action. Please retry."));
      pending.current = false;
      setBusy(false);
      return;
    }
  };

  const confirmDelete = async () => {
    if (!onDelete || pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const afterClose = await onDelete();
      onClose();
      afterClose?.();
    } catch (err) {
      showToast.error(err instanceof ApiError ? err.message : t("Could not complete this action. Please retry."));
      pending.current = false;
      setBusy(false);
    }
  };

  return { t, language, editing, name, setName, isPublic, setIsPublic, previewMediaId, setPreviewMediaId, displayedPreviewId, isPhotoPickerOpen, setIsPhotoPickerOpen, busy, confirmingDelete, setConfirmingDelete, closeDialog, registerDraft, retainDrafts, selectedImage, submit, confirmDelete };
}
