import { useEffect, useId, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { CustomDialog as Dialog, useCustomDialog } from "../../../components/ui/CustomDialog";
import * as Tabs from "@radix-ui/react-tabs";
import { Highlight, HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { UploadLift } from "../../../components/animate-ui/icons/upload-lift";
import { Button, ErrorState, Spinner, showToast } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import { mediaQueryOptions } from "../hooks/useMedia";
import { previewService } from "../services/previewService";
import { uploadService } from "../../uploads/services/uploadService";
import type { MediaFile } from "../types";

interface Props {
  selectedId: string | null;
  selectedIds?: string[];
  maxImages?: number;
  onConfirm: (image: MediaFile | null, previousImage: MediaFile | null) => void;
  onUploadedPreview: (mediaId: string) => void;
  onClose: () => void;
  backdropClassName?: string;
  viewportClassName?: string;
}

type PhotoSource = "gallery" | "preview";
const PAGE_SIZE = 48;
const sources = [
  { value: "gallery", label: "Gallery" },
  { value: "preview", label: "Preview" },
] satisfies { value: PhotoSource; label: string }[];

export function PhotoPicker({
  selectedId, selectedIds = [], maxImages = Infinity, onConfirm, onUploadedPreview,
  onClose, backdropClassName = "", viewportClassName = "",
}: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const translate = useRef(t);
  translate.current = t;
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const uploadInFlight = useRef(false);
  const pickerDrafts = useRef(new Set<string>());
  const confirmedId = useRef<string | null>(null);
  const focusedSelection = useRef(false);
  const [source, setSource] = useState<PhotoSource>("gallery");
  const [picked, setPicked] = useState<MediaFile | null>(null);
  const [uploaded, setUploaded] = useState<MediaFile[]>([]);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [galleryBatchId, setGalleryBatchId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [initialized, setInitialized] = useState(!selectedId);
  const tabId = useId();
  const initialImage = useQuery({
    queryKey: ["picker-image", selectedId],
    queryFn: () => previewService.getImage(selectedId!),
    enabled: Boolean(selectedId),
    staleTime: 0,
  });
  const gallery = useInfiniteQuery({
    ...mediaQueryOptions(PAGE_SIZE, "all", "image"),
    enabled: initialized && source === "gallery",
  });
  const previews = useInfiniteQuery({
    queryKey: ["previews", PAGE_SIZE],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => previewService.list(pageParam, PAGE_SIZE),
    getNextPageParam: (page) => page.offset + page.items.length < page.total
      ? page.offset + page.items.length : undefined,
    enabled: initialized && source === "preview",
  });
  const query = source === "gallery" ? gallery : previews;
  const batch = useQuery({
    queryKey: ["uploads", "picker", galleryBatchId],
    queryFn: () => uploadService.get(galleryBatchId!),
    enabled: Boolean(galleryBatchId),
    refetchInterval: (current) => current.state.data
      && ["Completed", "Failed", "Cancelled"].includes(current.state.data.status) ? false : 2000,
    retry: false,
  });
  const busy = uploadingPreview || galleryBatchId !== null;
  const { dialogProps, close } = useCustomDialog(onClose, { blocked: busy });
  const full = selectedIds.length >= maxImages && !initialImage.data?.isPreviewOnly;
  const pageImages = query.data?.pages.flatMap((page) => page.items) ?? [];
  const images = [...new Map([
    ...(source === "preview" ? uploaded : []),
    ...(picked && Boolean(picked.isPreviewOnly) === (source === "preview") ? [picked] : []),
    ...pageImages,
  ].map((image) => [image.id, image])).values()];

  useEffect(() => {
    if (!initialized && initialImage.data) {
      setPicked(initialImage.data);
      setSource(initialImage.data.isPreviewOnly ? "preview" : "gallery");
      setInitialized(true);
    }
  }, [initialized, initialImage.data]);

  useEffect(() => {
    if (initialized && !query.isPending && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest" });
      if (!focusedSelection.current) {
        selectedRef.current.focus({ preventScroll: true });
        focusedSelection.current = true;
      }
    }
  }, [initialized, source, query.isPending]);

  useEffect(() => {
    const result = batch.data;
    if (!galleryBatchId) return;
    if (batch.isError || (result && ["Completed", "Failed", "Cancelled"].includes(result.status))) {
      setGalleryBatchId(null);
      uploadInFlight.current = false;
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      void queryClient.invalidateQueries({ queryKey: ["uploads"] });
      if (batch.isError || result?.status !== "Completed" || result.failedFiles > 0)
        showToast.error(t("Could not start this upload."));
    }
  }, [batch.data, batch.isError, galleryBatchId, queryClient, t]);

  useEffect(() => {
    const drafts = pickerDrafts.current;
    return () => {
      for (const mediaId of drafts) {
        if (mediaId !== confirmedId.current) {
          void previewService.releaseDraft(mediaId)
            .then(() => queryClient.invalidateQueries({ queryKey: ["previews"] }))
            .catch((error: unknown) => showToast.error(
              translate.current("Could not remove unused preview."), error instanceof Error ? error.message : undefined,
            ));
        }
      }
    };
  }, [queryClient]);

  const upload = async (file: File | undefined) => {
    if (!file || uploadInFlight.current) return;
    if (file.type && !file.type.startsWith("image/")) {
      showToast.error(t("Choose an image file."));
      return;
    }
    uploadInFlight.current = true;
    setUploadingPreview(true);
    try {
      if (source === "preview") {
        const image = await previewService.upload(file);
        pickerDrafts.current.add(image.id);
        onUploadedPreview(image.id);
        setUploaded((current) => [image, ...current]);
        setPicked(image);
        void queryClient.invalidateQueries({ queryKey: ["previews"] });
        uploadInFlight.current = false;
      } else {
        const submitted = await uploadService.submit([file]);
        setGalleryBatchId(submitted.id);
      }
    } catch (error) {
      uploadInFlight.current = false;
      showToast.error(t("Could not start this upload."), error instanceof Error ? error.message : undefined);
    } finally {
      setUploadingPreview(false);
    }
  };

  return (
    <Dialog.Root {...dialogProps}>
      <Dialog.Portal>
        <Dialog.Backdrop className={`confirmation-dialog-backdrop ${backdropClassName}`} />
        <Dialog.Viewport className={`confirmation-dialog-viewport ${viewportClassName}`}>
          <Dialog.Popup className="place-picker" aria-busy={busy} initialFocus={() => selectedRef.current ?? bodyRef.current}>
            <header className="place-picker__header">
              <div>
                <Dialog.Title className="place-picker__title">{t("Choose photos")}</Dialog.Title>
                <Dialog.Description className="place-picker__count">
                  {t("{count} of {max} selected", { count: picked ? 1 : 0, max: 1 })}
                </Dialog.Description>
              </div>
            </header>
            <div className="place-picker__scroll-progress" aria-hidden="true">
              <span style={{ width: `${scrollProgress}%` }} />
            </div>
            <Tabs.Root className="photo-picker__tabs" value={source} onValueChange={(value) => {
              setSource(value === "preview" ? "preview" : "gallery");
              setScrollProgress(0);
              bodyRef.current?.scrollTo({ top: 0 });
            }}>
              <Tabs.List className="photo-picker__tab-list" aria-label={t("Photo source")}>
                <Highlight value={source} controlledItems className="photo-picker__highlight">
                  {sources.map(({ value, label }) => (
                    <HighlightItem key={value} value={value} className="photo-picker__tab-item">
                      <Tabs.Trigger id={`${tabId}-${value}`} className="photo-picker__tab" value={value}
                        disabled={busy || !initialized}>
                        {t(label)}
                      </Tabs.Trigger>
                    </HighlightItem>
                  ))}
                </Highlight>
              </Tabs.List>
              <div ref={bodyRef} className="place-picker__body" role="tabpanel" tabIndex={-1} aria-labelledby={`${tabId}-${source}`}
                onScroll={(event) => {
                  const element = event.currentTarget;
                  const range = element.scrollHeight - element.clientHeight;
                  setScrollProgress(range > 0 ? Math.min(100, Math.max(0, element.scrollTop / range * 100)) : 0);
                  if (range - element.scrollTop < 160 && query.hasNextPage
                    && !query.isFetchingNextPage && !query.isFetchNextPageError) void query.fetchNextPage();
                }}>
                {!initialized ? initialImage.isError ? (
                  <ErrorState message={t("Could not load media.")} onRetry={() => void initialImage.refetch()} />
                ) : <Spinner label={t("Loading images…")} /> : (
                  <>
                    <input ref={inputRef} type="file" accept="image/*" hidden onChange={(event) => {
                      void upload(event.currentTarget.files?.[0]);
                      event.currentTarget.value = "";
                    }} />
                    <div className="place-picker__grid" role="group" aria-label={t("Choose photos")}>
                      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                        <button type="button" className="place-picker__item place-picker__upload"
                          disabled={busy || full} onClick={() => inputRef.current?.click()}>
                          {busy ? <Spinner label={t("Uploading…")} /> : <><UploadLift size={28} aria-hidden="true" />{t("Upload")}</>}
                        </button>
                      </AnimateIcon>
                      {images.map((image) => (
                        <button key={image.id} ref={picked?.id === image.id ? selectedRef : undefined} type="button"
                          className="place-picker__item" aria-pressed={picked?.id === image.id}
                          aria-label={image.originalFilename} title={image.originalFilename}
                          disabled={busy || (full && !selectedIds.includes(image.id))}
                          onClick={() => setPicked(image)}>
                          <img src={mediaPreviewUrl(image.id)} alt="" loading="lazy" />
                          {picked?.id === image.id && <span className="place-picker__badge" aria-hidden="true">1</span>}
                        </button>
                      ))}
                    </div>
                    {query.isPending || query.isFetchingNextPage ? <Spinner label={t("Loading images…")} /> : null}
                    {query.isError && !query.isFetchNextPageError ? (
                      <ErrorState message={t("Could not load media.")} onRetry={() => void query.refetch()} />
                    ) : null}
                    {query.isSuccess && images.length === 0 ? <p className="album-photo-picker__note">{t("No images yet.")}</p> : null}
                    {query.isFetchNextPageError ? <Button type="button" variant="secondary" className="place-picker__more"
                      onClick={() => void query.fetchNextPage()}>{t("Load more")}</Button> : null}
                  </>
                )}
              </div>
            </Tabs.Root>
            <footer className="place-picker__footer">
              <div className="place-picker__actions">
                <Button type="button" disabled={busy || !initialized || (!picked && selectedIds.length > 0)} onClick={() => {
                  confirmedId.current = picked?.id ?? null;
                  onConfirm(picked, initialImage.data ?? null);
                  close();
                }}>{t("Done")}</Button>
                <Dialog.Close className="btn btn--danger place-picker__cancel" disabled={busy}>{t("Cancel")}</Dialog.Close>
              </div>
            </footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
