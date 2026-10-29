import { useState, type FormEvent } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";
import { X } from "@/components/animate-ui/icons/x";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Button } from "../../../components/ui/Button";
import { Spinner, ErrorState } from "../../../components/ui/Status";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { mediaUrl } from "../../../utils/media";
import { useCollections, useInvalidateCollections } from "../hooks/useCollections";
import { collectionService } from "../services/collectionService";
import type { Collection } from "../types";
import { COLLECTION_NAME_MAX_LENGTH } from "../types";

interface Props {
  postId: string;
  onClose: () => void;
}

/** Lists the viewer's collections with save state for one post, and creates new collections inline. */
export function SaveToCollectionDialog({ postId, onClose }: Props) {
  const { t } = useLocale();
  const collections = useCollections("mine", postId);
  const invalidate = useInvalidateCollections();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const describe = (err: unknown) => (err instanceof ApiError ? err.message : t("Could not complete this action. Please retry."));

  const toggle = async (collection: Collection) => {
    if (pendingId) return;
    setPendingId(collection.id);
    try {
      if (collection.containsPost) {
        await collectionService.removePost(collection.id, postId);
      } else {
        await collectionService.addPost(collection.id, postId);
      }
      await invalidate();
    } catch (err) {
      showToast.error(describe(err));
    } finally {
      setPendingId(null);
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      await collectionService.create({ name: trimmed, postId });
      setName("");
      await invalidate();
    } catch (err) {
      showToast.error(describe(err));
    } finally {
      setCreating(false);
    }
  };

  const items = collections.data ?? [];

  return (
    <AlertDialog.Root defaultOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" onClick={onClose} />
        <AlertDialog.Viewport
          className="confirmation-dialog-viewport"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <AlertDialog.Popup from="top" className="confirmation-dialog collection-dialog" onClick={(e) => e.stopPropagation()}>
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button type="button" className="btn btn--ghost confirmation-dialog__close" aria-label={t("Close")} title={t("Close")} onClick={onClose}>
                <X size={20} aria-hidden="true" />
              </button>
            </AnimateIcon>
            <AlertDialog.Title className="confirmation-dialog__title">{t("Save to collection")}</AlertDialog.Title>
            <div className="collection-dialog__body">
                {collections.isPending ? <Spinner label={t("Loading collections…")} /> : collections.isError ? (
                  <ErrorState message={t("Could not load collections.")} onRetry={() => void collections.refetch()} />
                ) : items.length === 0 ? (
                  <p className="collection-dialog__empty">{t("You have no collections yet. Create one below.")}</p>
                ) : (
                  <ul className="collection-picker" aria-label={t("Your collections")}>
                    {items.map((collection) => (
                      <li key={collection.id}>
                        <button
                          type="button"
                          className="collection-picker__item"
                          aria-pressed={collection.containsPost}
                          disabled={pendingId !== null}
                          aria-busy={pendingId === collection.id || undefined}
                          onClick={() => void toggle(collection)}
                        >
                          <span className="collection-picker__thumb" aria-hidden="true">
                            {collection.previewMediaId ? <img src={mediaUrl(collection.previewMediaId)} alt="" loading="lazy" /> : <Bookmark size={18} />}
                          </span>
                          <span className="collection-picker__text">
                            <span className="collection-picker__name">{collection.name}</span>
                            <span className="collection-picker__meta">
                              {t("{count} posts", { count: collection.postCount })} · {t(collection.isPublic ? "Public" : "Private")}
                            </span>
                          </span>
                          <span className="collection-picker__state">{t(collection.containsPost ? "Saved" : "Save")}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <form className="collection-dialog__create" onSubmit={(event) => void create(event)}>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={COLLECTION_NAME_MAX_LENGTH}
                    placeholder={t("New collection name")}
                    aria-label={t("New collection name")}
                    disabled={creating}
                  />
                  <Button type="submit" variant="secondary" busy={creating} disabled={!name.trim()}>{t("Create")}</Button>
                </form>
            </div>
            <footer className="confirmation-dialog__actions">
              <button type="button" className="btn btn--primary" onClick={onClose}>{t("Done")}</button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
