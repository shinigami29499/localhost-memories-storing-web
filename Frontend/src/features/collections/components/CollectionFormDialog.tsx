import { useState, type FormEvent } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";
import { X } from "@/components/animate-ui/icons/x";
import { Button } from "../../../components/ui/Button";
import { showToast } from "../../../components/ui/Toast";
import { Spinner } from "../../../components/ui/Status";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { mediaUrl } from "../../../utils/media";
import { useCollectionPosts } from "../hooks/useCollections";
import type { Collection, UpdateCollectionInput } from "../types";
import { COLLECTION_NAME_MAX_LENGTH } from "../types";

const PREVIEW_CANDIDATE_LIMIT = 100;

interface Props {
  /** Existing collection to edit; omit to create a new one. */
  collection?: Collection;
  onSubmit: (input: UpdateCollectionInput) => Promise<void>;
  onClose: () => void;
}

/** Create or edit a collection: name, visibility, and (when editing) the preview image. */
export function CollectionFormDialog({ collection, onSubmit, onClose }: Props) {
  const { t } = useLocale();
  const editing = Boolean(collection);
  const [name, setName] = useState(collection?.name ?? "");
  const [isPublic, setIsPublic] = useState(collection?.isPublic ?? false);
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(collection?.customPreviewMediaId ?? null);
  const [busy, setBusy] = useState(false);
  const posts = useCollectionPosts(collection?.id, 1, PREVIEW_CANDIDATE_LIMIT, editing);
  const images = (posts.data?.items ?? []).flatMap((post) =>
    post.media.filter((file) => file.mediaKind === "image").map((file) => ({ id: file.id, author: post.author.username })),
  );

  const close = () => {
    if (!busy) onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit({ name: trimmed, isPublic, previewMediaId });
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
          <AlertDialog.Popup from="top" className="confirmation-dialog collection-dialog" onClick={(e) => e.stopPropagation()}>
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button type="button" className="btn btn--ghost confirmation-dialog__close" aria-label={t("Close")} title={t("Close")} disabled={busy} onClick={close}>
                <X size={20} aria-hidden="true" />
              </button>
            </AnimateIcon>
            <AlertDialog.Title className="confirmation-dialog__title">{t(editing ? "Edit collection" : "New collection")}</AlertDialog.Title>
            <form onSubmit={(event) => void submit(event)}>
              <fieldset className="collection-dialog__body collection-form" disabled={busy}>
                <label className="collection-form__field">
                  <span>{t("Name")}</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={COLLECTION_NAME_MAX_LENGTH}
                    required
                    autoFocus
                  />
                </label>
                <label className="collection-form__toggle">
                  <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
                  <span>
                    <strong>{t("Public collection")}</strong>
                    <small>{t("Anyone signed in can view a public collection. Private collections are only visible to you.")}</small>
                  </span>
                </label>
                {editing ? (
                  <div className="collection-form__field">
                    <span id="collection-preview-label">{t("Preview image")}</span>
                    {posts.isPending ? <Spinner label={t("Loading images…")} /> : (
                      <div className="preview-picker" role="radiogroup" aria-labelledby="collection-preview-label">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={previewMediaId === null}
                          className="preview-picker__option preview-picker__option--default"
                          onClick={() => setPreviewMediaId(null)}
                        >
                          {t("Default (first post image)")}
                        </button>
                        {images.map((image) => (
                          <button
                            key={image.id}
                            type="button"
                            role="radio"
                            aria-checked={previewMediaId === image.id}
                            aria-label={t("Use image by {username} as preview", { username: image.author })}
                            className="preview-picker__option"
                            onClick={() => setPreviewMediaId(image.id)}
                          >
                            <img src={mediaUrl(image.id)} alt="" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                    {!posts.isPending && images.length === 0 ? (
                      <small className="collection-form__hint">{t("Save posts with images to choose a preview.")}</small>
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
