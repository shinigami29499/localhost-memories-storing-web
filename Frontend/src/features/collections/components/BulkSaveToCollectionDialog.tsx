import { useState, type FormEvent } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";
import { X } from "@/components/animate-ui/icons/x";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Button } from "../../../components/ui/Button";
import { ErrorState, Spinner } from "../../../components/ui/Status";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { mediaUrl } from "../../../utils/media";
import { useCollections, useInvalidateCollections } from "../hooks/useCollections";
import { collectionService } from "../services/collectionService";
import { COLLECTION_NAME_MAX_LENGTH } from "../types";

interface Props {
  postIds: string[];
  onSaved: () => void;
  onClose: () => void;
}

async function addPostsToCollection(collectionId: string, postIds: string[]) {
  const results: PromiseSettledResult<unknown>[] = [];
  for (let offset = 0; offset < postIds.length; offset += 5) {
    const batch = postIds.slice(offset, offset + 5);
    results.push(...await Promise.allSettled(batch.map((postId) => collectionService.addPost(collectionId, postId))));
  }
  return results;
}

export function BulkSaveToCollectionDialog({ postIds, onSaved, onClose }: Props) {
  const { t } = useLocale();
  const collections = useCollections("mine");
  const invalidate = useInvalidateCollections();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const reportSaveResults = async (results: PromiseSettledResult<unknown>[]) => {
    await invalidate();
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed > 0) {
      showToast.error(t("{failed} of {total} posts could not be saved.", { failed, total: postIds.length }));
      return false;
    }
    showToast.success(t("Posts saved successfully"));
    onSaved();
    return true;
  };

  const save = async (collectionId: string) => {
    if (pendingId !== null || creating) return;
    setPendingId(collectionId);
    try {
      await reportSaveResults(await addPostsToCollection(collectionId, postIds));
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not complete this action. Please retry."));
    } finally {
      setPendingId(null);
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating || pendingId !== null) return;
    setCreating(true);
    try {
      const collection = await collectionService.create({ name: trimmed });
      setName("");
      await reportSaveResults(await addPostsToCollection(collection.id, postIds));
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not complete this action. Please retry."));
    } finally {
      setCreating(false);
    }
  };

  const items = collections.data ?? [];
  const busy = pendingId !== null || creating;

  return (
    <AlertDialog.Root defaultOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" onClick={onClose} />
        <AlertDialog.Viewport
          className="confirmation-dialog-viewport"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <AlertDialog.Popup from="top" className="confirmation-dialog collection-dialog" onClick={(event) => event.stopPropagation()}>
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button
                type="button"
                className="btn btn--ghost confirmation-dialog__close"
                aria-label={t("Close")}
                title={t("Close")}
                disabled={busy}
                onClick={onClose}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </AnimateIcon>
            <AlertDialog.Title className="confirmation-dialog__title">
              {t("Save {count} posts to a collection", { count: postIds.length })}
            </AlertDialog.Title>
            <div className="collection-dialog__body" aria-busy={busy}>
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
                        disabled={busy}
                        aria-busy={pendingId === collection.id || undefined}
                        onClick={() => void save(collection.id)}
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
                        <span className="collection-picker__state">
                          {pendingId === collection.id
                            ? <LoaderCircle size={16} className="spinner__wheel" aria-hidden="true" />
                            : t("Save")}
                        </span>
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
                  disabled={busy}
                />
                <Button type="submit" variant="secondary" busy={creating} disabled={!name.trim() || busy}>
                  {t("Create")}
                </Button>
              </form>
            </div>
            <footer className="confirmation-dialog__actions">
              <button type="button" className="btn btn--primary" disabled={busy} onClick={onClose}>{t("Done")}</button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
