import { useState, type FormEvent } from "react";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Dialog } from "@base-ui/react/dialog";
import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";
import { X } from "@/components/animate-ui/icons/x";
import { Button } from "../../../components/ui/Button";
import { showToast } from "../../../components/ui/Toast";
import { ErrorState, Spinner } from "../../../components/ui/Status";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { mediaPreviewUrl } from "../../../utils/media";
import { useInfiniteAlbumMedia } from "../hooks/useAlbums";
import type { Album, UpdateAlbumInput } from "../types";
import { ALBUM_NAME_MAX_LENGTH } from "../types";

const PREVIEW_PAGE_SIZE = 48;

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
  const [isPublic, setIsPublic] = useState(album?.isPublic ?? false);
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(album?.customPreviewMediaId ?? null);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [pendingPreviewMediaId, setPendingPreviewMediaId] = useState<string | null>(album?.customPreviewMediaId ?? null);
  const [busy, setBusy] = useState(false);
  const media = useInfiniteAlbumMedia(album?.id, PREVIEW_PAGE_SIZE, editing, "image");
  const images = media.data?.pages.flatMap((page) => page.items) ?? [];

  const close = () => {
    if (!busy) onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const input: UpdateAlbumInput = { name: trimmed, isPublic, previewMediaId };
      await onSubmit(input);
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
                    <Button type="button" className="album-form__choose-photos" onClick={() => { setPendingPreviewMediaId(previewMediaId); setIsPhotoPickerOpen(true); }}>
                      {t("Choose photos")}
                    </Button>
                    <small className="album-form__hint">
                      {previewMediaId ? t("Selected photo: {filename}", { filename: images.find((image) => image.id === previewMediaId)?.originalFilename ?? "" }) : t("Default (first image)")}
                    </small>
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
      {isPhotoPickerOpen ? (
        <Dialog.Root open onOpenChange={setIsPhotoPickerOpen}>
          <Dialog.Portal>
            <Dialog.Backdrop className="confirmation-dialog-backdrop album-photo-picker-backdrop" />
            <Dialog.Viewport className="confirmation-dialog-viewport album-photo-picker-viewport">
              <Dialog.Popup className="album-photo-picker" aria-busy={media.isPending}>
                <header className="album-photo-picker__header">
                  <div>
                    <Dialog.Title className="album-photo-picker__title">{t("Choose photos")}</Dialog.Title>
                    <Dialog.Description className="album-photo-picker__count">
                      {t("{count} of {max} selected", { count: pendingPreviewMediaId ? 1 : 0, max: 1 })}
                    </Dialog.Description>
                  </div>
                </header>
                <div className="album-photo-picker__body" onScroll={(event) => {
                  const element = event.currentTarget;
                  if (element.scrollHeight - element.scrollTop - element.clientHeight < 160 && media.hasNextPage && !media.isFetchingNextPage) {
                    void media.fetchNextPage();
                  }
                }}>
                  {media.isPending ? <Spinner label={t("Loading images…")} /> : null}
                  {media.isError ? <ErrorState message={t("Could not load media.")} onRetry={() => void media.refetch()} /> : null}
                  {media.isSuccess ? (
                    <div className="album-photo-picker__grid" role="radiogroup" aria-label={t("Choose photos")}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={pendingPreviewMediaId === null}
                        aria-label={t("Default (first image)")}
                        className="album-photo-picker__option album-photo-picker__default"
                        onClick={() => setPendingPreviewMediaId(null)}
                      >
                        {t("Default (first image)")}
                      </button>
                      {images.map((image) => (
                        <button
                          key={image.id}
                          type="button"
                          role="radio"
                          aria-checked={pendingPreviewMediaId === image.id}
                          aria-label={t("Use {filename} as preview", { filename: image.originalFilename })}
                          title={image.originalFilename}
                          className="album-photo-picker__option"
                          onClick={() => setPendingPreviewMediaId(image.id)}
                        >
                          <img src={mediaPreviewUrl(image.id)} alt="" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {media.isFetchingNextPage ? <Spinner label={t("Loading images…")} /> : null}
                </div>
                <footer className="album-photo-picker__footer">
                  <Button type="button" onClick={() => { setPreviewMediaId(pendingPreviewMediaId); setIsPhotoPickerOpen(false); }}>{t("Done")}</Button>
                </footer>
              </Dialog.Popup>
            </Dialog.Viewport>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
    </AlertDialog.Root>
  );
}
