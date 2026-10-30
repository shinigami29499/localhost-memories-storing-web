import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button, ErrorState, Spinner } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { XIcon } from "../../../components/animate-ui/icons/x";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import { useMedia } from "../../media/hooks/useMedia";
import { MAX_FOOD_PLACE_IMAGES } from "../types";

interface Props {
  selectedIds: string[];
  onConfirm: (mediaIds: string[]) => void;
  onClose: () => void;
}

const PAGE_SIZE = 48;

export function FoodImagePicker({ selectedIds, onConfirm, onClose }: Props) {
  const { t } = useLocale();
  const query = useMedia(PAGE_SIZE, "all", "image");
  const [picked, setPicked] = useState<string[]>(selectedIds);
  const images = query.data?.pages.flatMap((page) => page.items) ?? [];
  const full = picked.length >= MAX_FOOD_PLACE_IMAGES;

  const toggle = (mediaId: string) => {
    setPicked((current) => current.includes(mediaId)
      ? current.filter((id) => id !== mediaId)
      : current.length >= MAX_FOOD_PLACE_IMAGES ? current : [...current, mediaId]);
  };

  return (
    <Dialog.Root defaultOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirmation-dialog-backdrop" />
        <Dialog.Viewport className="confirmation-dialog-viewport">
          <Dialog.Popup className="food-picker">
            <header className="food-picker__header">
              <div>
                <Dialog.Title className="food-picker__title">{t("Choose photos")}</Dialog.Title>
                <Dialog.Description className="food-picker__count">
                  {t("{count} of {max} selected", { count: picked.length, max: MAX_FOOD_PLACE_IMAGES })}
                </Dialog.Description>
              </div>
              <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                <Dialog.Close className="food-picker__close" aria-label={t("Close")} title={t("Close")}>
                  <XIcon size={20} aria-hidden="true" />
                </Dialog.Close>
              </AnimateIcon>
            </header>

            <div className="food-picker__body">
              {query.isPending ? <Spinner label="Loading photos…" /> : query.isError ? (
                <ErrorState message="Could not load photos." onRetry={() => void query.refetch()} />
              ) : images.length === 0 ? (
                <p className="food__hint">{t("Upload photos first, then add them to this place.")}</p>
              ) : (
                <ul className="food-picker__grid">
                  {images.map((image) => {
                    const order = picked.indexOf(image.id);
                    const selected = order >= 0;
                    return (
                      <li key={image.id}>
                        <button
                          type="button"
                          className="food-picker__item"
                          aria-pressed={selected}
                          aria-label={image.originalFilename}
                          title={image.originalFilename}
                          disabled={!selected && full}
                          onClick={() => toggle(image.id)}
                        >
                          <img src={mediaPreviewUrl(image.id)} alt="" loading="lazy" />
                          {selected && (
                            <span className="food-picker__badge" aria-hidden="true">{order + 1}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {query.hasNextPage && (
                <Button
                  type="button"
                  variant="secondary"
                  className="food-picker__more"
                  busy={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  {t("Load more")}
                </Button>
              )}
            </div>

            <footer className="food-picker__footer">
              <small>{t("The first photo is the cover.")}</small>
              <div className="food-picker__actions">
                <Dialog.Close className="btn btn--secondary">{t("Cancel")}</Dialog.Close>
                <Button type="button" onClick={() => { onConfirm(picked); onClose(); }}>{t("Done")}</Button>
              </div>
            </footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
