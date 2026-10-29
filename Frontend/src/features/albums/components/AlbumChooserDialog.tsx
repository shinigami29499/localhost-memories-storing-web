import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { X } from "@/components/animate-ui/icons/x";
import { useLocale } from "../../../context/LocaleContext";
import { mediaUrl } from "../../../utils/media";
import type { Album } from "../types";

interface Props {
  albums: Album[];
  onClose: () => void;
  onSelect: (album: Album) => void;
}

export function AlbumChooserDialog({ albums, onClose, onSelect }: Props) {
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
          <AlertDialog.Popup from="top" className="confirmation-dialog album-dialog" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="btn btn--ghost confirmation-dialog__close"
              aria-label={t("Close")}
              title={t("Close")}
              onClick={onClose}
            >
              <X size={20} aria-hidden="true" />
            </button>
            <AlertDialog.Title className="confirmation-dialog__title">{t("Choose an album")}</AlertDialog.Title>
            <div className="album-dialog__body">
              <ul className="album-picker" aria-label={t("Your albums")}>
                {albums.map((album) => (
                  <li key={album.id}>
                    <button
                      type="button"
                      className="album-picker__item"
                      aria-label={t("Open album {name}", { name: album.name })}
                      onClick={() => onSelect(album)}
                    >
                      <span className="album-picker__thumb" aria-hidden="true">
                        {album.previewMediaId ? (
                          <img src={mediaUrl(album.previewMediaId)} alt="" loading="lazy" />
                        ) : (
                          <Bookmark size={18} />
                        )}
                      </span>
                      <span className="album-picker__text">
                        <span className="album-picker__name">{album.name}</span>
                        <span className="album-picker__meta">
                          {t("{count} media", { count: album.mediaCount })} · {t(album.isPublic ? "Public" : "Private")}
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
