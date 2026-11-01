import { CustomDialog as AlertDialog, useCustomDialog } from "../../../components/ui/CustomDialog";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import type { Album } from "../types";

interface Props {
  albums: Album[];
  onClose: () => void;
  onSelect: (album: Album) => void;
}

export function AlbumChooserDialog({ albums, onClose, onSelect }: Props) {
  const { t } = useLocale();
  const { dialogProps, close, dismiss } = useCustomDialog(onClose);

  return (
    <AlertDialog.Root {...dialogProps}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmation-dialog-backdrop" />
        <AlertDialog.Viewport className="confirmation-dialog-viewport">
          <AlertDialog.Popup className="confirmation-dialog album-dialog">
            <AlertDialog.Title className="confirmation-dialog__title">{t("Choose an album")}</AlertDialog.Title>
            <div className="album-dialog__body">
              <ul className="album-picker" aria-label={t("Your albums")}>
                {albums.map((album) => (
                  <li key={album.id}>
                    <button
                      type="button"
                      className="album-picker__item"
                      aria-label={t("Open album {name}", { name: album.name })}
                      onClick={() => close(() => onSelect(album))}
                    >
                      <span className="album-picker__thumb" aria-hidden="true">
                        {album.previewMediaId ? (
                          <img src={mediaPreviewUrl(album.previewMediaId)} alt="" loading="lazy" />
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
              <button type="button" className="btn btn--danger" onClick={dismiss}>{t("Cancel")}</button>
            </footer>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
