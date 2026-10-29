import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { X } from "@/components/animate-ui/icons/x";
import { useLocale } from "../../../context/LocaleContext";
import { mediaUrl } from "../../../utils/media";
import type { Collection } from "../types";

interface Props {
  collections: Collection[];
  onClose: () => void;
  onSelect: (collection: Collection) => void;
}

export function SavedCollectionDialog({ collections, onClose, onSelect }: Props) {
  const { t } = useLocale();

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
            <button
              type="button"
              className="btn btn--ghost confirmation-dialog__close"
              aria-label={t("Close")}
              title={t("Close")}
              onClick={onClose}
            >
              <X size={20} aria-hidden="true" />
            </button>
            <AlertDialog.Title className="confirmation-dialog__title">{t("Choose a collection")}</AlertDialog.Title>
            <div className="collection-dialog__body">
              <ul className="collection-picker" aria-label={t("Your collections")}>
                {collections.map((collection) => (
                  <li key={collection.id}>
                    <button
                      type="button"
                      className="collection-picker__item"
                      aria-label={t("Open collection {name}", { name: collection.name })}
                      onClick={() => onSelect(collection)}
                    >
                      <span className="collection-picker__thumb" aria-hidden="true">
                        {collection.previewMediaId ? (
                          <img src={mediaUrl(collection.previewMediaId)} alt="" loading="lazy" />
                        ) : (
                          <Bookmark size={18} />
                        )}
                      </span>
                      <span className="collection-picker__text">
                        <span className="collection-picker__name">{collection.name}</span>
                        <span className="collection-picker__meta">
                          {t("{count} posts", { count: collection.postCount })} · {t(collection.isPublic ? "Public" : "Private")}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <footer className="confirmation-dialog__actions">
              <button type="button" className="btn btn--primary" onClick={onClose}>{t("Cancel")}</button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
