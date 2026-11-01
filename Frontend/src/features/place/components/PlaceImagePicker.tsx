import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@base-ui/react/dialog";
import { Button, ErrorState, Spinner } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { XIcon } from "../../../components/animate-ui/icons/x";
import { UploadLift } from "../../../components/animate-ui/icons/upload-lift";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import { useMedia } from "../../media/hooks/useMedia";
import { MAX_PLACE_IMAGES } from "../types";
import { uploadService } from "../../uploads/services/uploadService";
import { showToast } from "../../../components/ui";

interface Props {
  selectedIds: string[];
  onConfirm: (mediaIds: string[]) => void;
  onClose: () => void;
}

const PAGE_SIZE = 48;

export function PlaceImagePicker({ selectedIds, onConfirm, onClose }: Props) {
  const { t } = useLocale();
  const query = useMedia(PAGE_SIZE, "all", "image");
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadBatchId, setUploadBatchId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const images = query.data?.pages.flatMap((page) => page.items) ?? [];
  const full = selectedIds.length >= MAX_PLACE_IMAGES;

  useEffect(() => {
    if (!uploadBatchId) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void uploadService.get(uploadBatchId).then((batch) => {
        if (cancelled || !["Completed", "Failed", "Cancelled"].includes(batch.status)) return;
        window.clearInterval(timer);
        setUploadBatchId(null);
        setUploading(false);
        void queryClient.invalidateQueries({ queryKey: ["media"] });
        if (batch.failedFiles > 0) showToast.error(t("Could not start this upload."));
      }).catch(() => {
        if (!cancelled) { window.clearInterval(timer); setUploadBatchId(null); setUploading(false); showToast.error(t("Could not start this upload.")); }
      });
    }, 2000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [uploadBatchId, queryClient, t]);

  const uploadImages = async (files: File[]) => {
    if (!files.length || uploading) return;
    setUploading(true);
    try {
      const batch = await uploadService.submit(files);
      setUploadBatchId(batch.id);
      void queryClient.invalidateQueries({ queryKey: ["uploads"] });
    } catch (error) {
      setUploading(false);
      showToast.error(t("Could not start this upload."), error instanceof Error ? error.message : undefined);
    }
  };

  const toggle = (mediaId: string) => {
    setPicked((current) => current === mediaId ? null : mediaId);
  };

  return (
    <Dialog.Root defaultOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirmation-dialog-backdrop" />
        <Dialog.Viewport className="confirmation-dialog-viewport">
          <Dialog.Popup className="place-picker">
            <header className="place-picker__header">
              <div>
                <Dialog.Title className="place-picker__title">{t("Choose photos")}</Dialog.Title>
                <Dialog.Description className="place-picker__count">
                  {t("{count} of {max} selected", { count: picked ? 1 : 0, max: 1 })}
                </Dialog.Description>
              </div>
              <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                <Dialog.Close className="place-picker__close" aria-label={t("Close")} title={t("Close")}>
                  <XIcon size={20} aria-hidden="true" />
                </Dialog.Close>
              </AnimateIcon>
            </header>

            <div className="place-picker__scroll-progress" aria-hidden="true"><span style={{ width: `${scrollProgress}%` }} /></div>
            <div className="place-picker__body" onScroll={(event) => {
              const element = event.currentTarget;
              const remaining = element.scrollHeight - element.clientHeight - element.scrollTop;
              const range = element.scrollHeight - element.clientHeight;
              setScrollProgress(range > 0 ? Math.min(100, Math.max(0, element.scrollTop / range * 100)) : 0);
              if (remaining < 160 && query.hasNextPage && !query.isFetchingNextPage && !query.isFetchNextPageError) void query.fetchNextPage();
            }}>
              {query.isPending ? <Spinner label="Loading photos…" /> : query.isError ? (
                <ErrorState message="Could not load photos." onRetry={() => void query.refetch()} />
              ) : (
                <ul className="place-picker__grid">
                  <li>
                    <input ref={inputRef} type="file" accept="image/*" hidden onChange={(event) => {
                      void uploadImages(Array.from(event.currentTarget.files ?? []));
                      event.currentTarget.value = "";
                    }} />
                    <AnimateIcon animateOnHover animateOnTap completeOnStop asChild><button type="button" className="place-picker__item place-picker__upload" disabled={uploading || full}
                      onClick={() => inputRef.current?.click()}>
                      {uploading ? <Spinner label="Uploading…" /> : <><UploadLift size={28} aria-hidden="true" />{t("Upload")}</>}
                    </button></AnimateIcon>
                  </li>
                  {images.map((image) => {
                    const selected = picked === image.id;
                    return (
                      <li key={image.id}>
                        <button
                          type="button"
                          className="place-picker__item"
                          aria-pressed={selected}
                          aria-label={image.originalFilename}
                          title={image.originalFilename}
                          disabled={selectedIds.includes(image.id) || full}
                          onClick={() => toggle(image.id)}
                        >
                          <img src={mediaPreviewUrl(image.id)} alt="" loading="lazy" />
                          {selected && (
                            <span className="place-picker__badge" aria-hidden="true">1</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {query.isFetchingNextPage && <Spinner label="Loading photos…" />}
              {query.isFetchNextPageError && (
                <Button
                  type="button"
                  variant="secondary"
                  className="place-picker__more"
                  busy={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  {t("Load more")}
                </Button>
              )}
            </div>

            <footer className="place-picker__footer">
              <div className="place-picker__actions">
                <Button type="button" disabled={!picked} onClick={() => { if (picked) onConfirm([...selectedIds, picked]); onClose(); }}>{t("Done")}</Button>
                <Dialog.Close className="btn btn--danger place-picker__cancel">{t("Cancel")}</Dialog.Close>
              </div>
            </footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
