import { useState, type FormEvent } from "react";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";
import { X } from "@/components/animate-ui/icons/x";
import { Button } from "../../../components/ui/Button";
import { showToast } from "../../../components/ui/Toast";
import { ErrorState, Spinner } from "../../../components/ui/Status";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { mediaPreviewUrl } from "../../../utils/media";
import { useAlbumMedia } from "../hooks/useAlbums";
import type { Album, UpdateAlbumInput } from "../types";
import { ALBUM_CAPTION_MAX_LENGTH, ALBUM_NAME_MAX_LENGTH } from "../types";

const PREVIEW_CANDIDATE_LIMIT = 100;

interface Props {
  /** Existing album to edit; omit to create a new one. */
  album?: Album;
  onSubmit: (input: UpdateAlbumInput) => Promise<void>;
  onClose: () => void;
}

/** Create or edit an album: name, visibility, and (when editing) the preview image. */
export function AlbumFormDialog({ album, onSubmit, onClose }: Props) {
  const { t } = useLocale();
  const editing = Boolean(album);
  const [name, setName] = useState(album?.name ?? "");
  const [caption, setCaption] = useState(album?.caption ?? "");
  const [isPublic, setIsPublic] = useState(album?.isPublic ?? false);
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(album?.customPreviewMediaId ?? null);
  const [busy, setBusy] = useState(false);
  const media = useAlbumMedia(album?.id, 1, PREVIEW_CANDIDATE_LIMIT, editing);
  const images = (media.data?.items ?? []).filter((item) => item.mediaKind === "image");

  const close = () => {
    if (!busy) onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit({ name: trimmed, caption: caption.trim(), isPublic, previewMediaId });
    } catch (err) {
      showToast.error(err instanceof ApiError ? err.message : t("Could not complete this action. Please retry."));
      setBusy(false);
      return;
    }
    onClose();
  };

  return (
    <AlertDialog.Root defaultOpen onOpenChange={(open) => { if (!open) close(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" onClick={close} />
        <AlertDialog.Viewport
          className="confirmation-dialog-viewport"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <AlertDialog.Popup from="top" className="confirmation-dialog album-dialog" onClick={(e) => e.stopPropagation()}>
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button type="button" className="btn btn--ghost confirmation-dialog__close" aria-label={t("Close")} title={t("Close")} disabled={busy} onClick={close}>
                <X size={20} aria-hidden="true" />
              </button>
            </AnimateIcon>
            <AlertDialog.Title className="confirmation-dialog__title">{t(editing ? "Edit album" : "New album")}</AlertDialog.Title>
            <form onSubmit={(event) => void submit(event)}>
              <fieldset className="album-dialog__body album-form" disabled={busy}>
                <label className="album-form__field">
                  <span>{t("Name")}</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={ALBUM_NAME_MAX_LENGTH}
                    required
                    autoFocus
                  />
                </label>
                <label className="album-form__field">
                  <span>{t("Album caption")}</span>
                  <textarea
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    maxLength={ALBUM_CAPTION_MAX_LENGTH}
                    rows={3}
                  />
                </label>
                <label className="album-form__toggle">
                  <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
                  <span>
                    <strong>{t("Public album")}</strong>
                    <small>{t("Anyone signed in can view a public album. Private albums are only visible to you.")}</small>
                  </span>
                </label>
                {editing ? (
                  <div className="album-form__field">
                    <span id="album-preview-label">{t("Preview image")}</span>
                    {media.isPending ? <Spinner label={t("Loading images…")} /> : media.isError ? (
                      <ErrorState message={t("Could not load media.")} onRetry={() => void media.refetch()} />
                    ) : (
                      <div className="preview-picker" role="radiogroup" aria-labelledby="album-preview-label">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={previewMediaId === null}
                          className="preview-picker__option preview-picker__option--default"
                          onClick={() => setPreviewMediaId(null)}
                        >
                          {t("Default (first image)")}
                        </button>
                        {images.map((image) => (
                          <button
                            key={image.id}
                            type="button"
                            role="radio"
                            aria-checked={previewMediaId === image.id}
                            aria-label={t("Use {filename} as preview", { filename: image.originalFilename })}
                            className="preview-picker__option"
                            onClick={() => setPreviewMediaId(image.id)}
                          >
                            <img src={mediaPreviewUrl(image.id)} alt="" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                    {!media.isPending && media.isSuccess && images.length === 0 ? (
                      <small className="album-form__hint">{t("Add images to this album to choose a preview.")}</small>
                    ) : null}
                  </div>
                ) : null}
              </fieldset>
              <footer className="confirmation-dialog__actions">
                <button type="button" className="btn btn--secondary" disabled={busy} onClick={close}>{t("Cancel")}</button>
                <Button type="submit" busy={busy} disabled={!name.trim()}>{t(editing ? "Save changes" : "Create")}</Button>
              </footer>
            </form>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
