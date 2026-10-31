import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { CopyButton, CopyButtonIcon } from "@animate-ui/react/primitives/buttons/copy";
import useEmblaCarousel, {
  CarouselCounter,
  CarouselDots,
} from "@animate-ui/react/primitives/carousel";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Check } from "@/components/animate-ui/icons/check";
import { Copy } from "@/components/animate-ui/icons/copy";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { MapPin } from "@/components/animate-ui/icons/map-pin";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { useNavigate } from "react-router-dom";
import { ErrorState, showToast, Spinner } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAlbums } from "../../albums/hooks/useAlbums";
import { mediaPreviewUrl, mediaUrl } from "../../../utils/media";
import type { MediaFile } from "../types";
import { DownloadButton } from "../../downloads/components/DownloadButton";
import { MediaFavoriteButton } from "./MediaFavoriteButton";

const SaveToAlbumDialog = lazy(() =>
  import("../../albums/components/SaveToAlbumDialog").then((module) => ({ default: module.SaveToAlbumDialog })),
);

const MAX_DOTS = 10;

async function loadImageAsPng(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image request failed with status ${response.status}.`);
  const bitmap = await createImageBitmap(await response.blob());

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create image canvas.");
    context.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode image."));
      }, "image/png");
    });
  } finally {
    bitmap.close();
  }
}

interface CommonProps {
  media: MediaFile[];
  initialMediaId: string;
  total?: number;
  loadingMore?: boolean;
  loadMoreError?: boolean;
  onLoadMore?: () => void;
  favoriteBusy?: boolean;
  onClose: (mediaId: string) => void;
}

type Props = CommonProps & ({
  trashActions: { onRestore: (mediaId: string) => void; onDelete: (mediaId: string) => void };
  onToggleFavorite?: never;
} | {
  trashActions?: never;
  onToggleFavorite: (mediaId: string, isFavorited: boolean) => void;
});

interface SlideProps {
  media: MediaFile;
  active: boolean;
  includeDeleted: boolean;
  onFavorite: () => void;
}

function PreviewSlide({ media, active, includeDeleted, onFavorite }: SlideProps) {
  const { t } = useLocale();
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { margin: "200px 0px" });
  const videoRef = useRef<HTMLVideoElement>(null);
  const url = active ? mediaUrl(media.id, includeDeleted) : mediaPreviewUrl(media.id, includeDeleted);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!active) videoRef.current?.pause();
  }, [active]);

  return (
    <div ref={stageRef} className="media-preview-dialog__stage" data-active={active}>
      {!active && !inView ? null : failedUrl === url ? (
        <p role={active ? "alert" : undefined}>{t("Could not load this media.")}</p>
      ) : media.mediaKind === "video" && active ? (
        <video
          ref={videoRef}
          key={url}
          src={url}
          controls={active}
          preload={active ? "metadata" : "none"}
          tabIndex={active ? 0 : -1}
          aria-label={media.originalFilename}
          onDoubleClick={active && !includeDeleted ? (event) => {
            event.preventDefault();
            onFavorite();
          } : undefined}
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <img
          key={url}
          src={url}
          alt={media.originalFilename}
          loading={active ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onDoubleClick={active && !includeDeleted ? onFavorite : undefined}
          onError={() => setFailedUrl(url)}
        />
      )}
    </div>
  );
}

export function MediaPreviewDialog({
  media, initialMediaId, total = media.length, loadingMore = false, loadMoreError = false,
  onLoadMore, favoriteBusy = false, onToggleFavorite, onClose, trashActions,
}: Props) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const albumButtonRef = useRef<HTMLButtonElement>(null);
  const lastViewedId = useRef(initialMediaId);
  const [initialIndex] = useState(() => {
    const index = media.findIndex((item) => item.id === initialMediaId);
    return index >= 0 ? index : 0;
  });
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const selectedSnap = useRef(initialIndex);
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const [copyResult, setCopyResult] = useState<{ mediaId: string } | null>(null);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const hasMore = Boolean(onLoadMore) && media.length < total;
  const slideCount = media.length + (hasMore ? 1 : 0);
  const [carouselRef, api] = useEmblaCarousel({
    startIndex: initialIndex,
    loop: !hasMore && media.length >= (isMobile ? 3 : 5),
    align: "center",
    containScroll: false,
    scale: 0.8,
    visible: isMobile || slideCount === 1 ? 1 : 3,
    watchDrag: (_api, event) => !(event.target instanceof Element && event.target.closest("video")),
  });
  const current = media[Math.min(selectedIndex, slideCount - 1)];
  const albums = useAlbums("mine", Boolean(current) && !trashActions, current?.id);
  const inAlbum = albums.data?.some((album) => album.containsMedia) ?? false;
  const imageCopied = copyResult !== null && copyResult.mediaId === current?.id;

  useEffect(() => {
    if (!copyResult) return;
    if (copyResult.mediaId !== current?.id) {
      setCopyResult(null);
      return;
    }
    const timeout = window.setTimeout(() => setCopyResult(null), 3_000);
    return () => window.clearTimeout(timeout);
  }, [copyResult, current?.id]);

  useEffect(() => {
    if (current) lastViewedId.current = current.id;
  }, [current]);

  useEffect(() => {
    if (media.length === 0) onClose(lastViewedId.current);
  }, [media.length, onClose]);

  useEffect(() => {
    if (hasMore && selectedIndex >= media.length && !loadingMore && !loadMoreError) {
      onLoadMore?.();
    }
  }, [hasMore, selectedIndex, media.length, loadingMore, loadMoreError, onLoadMore]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    closeRef.current?.focus();
    return () => dialog.close();
  }, []);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      selectedSnap.current = api.selectedScrollSnap();
      setSelectedIndex(selectedSnap.current);
    };
    const restoreSelection = () => {
      // Option changes reapply startIndex, including when the final page enables looping.
      api.scrollTo(Math.min(selectedSnap.current, Math.max(0, api.scrollSnapList().length - 1)), true);
      update();
    };
    update();
    api.on("select", update).on("reInit", restoreSelection);
    return () => {
      api.off("select", update).off("reInit", restoreSelection);
    };
  }, [api]);

  if (media.length === 0) return null;

  const close = () => onClose(lastViewedId.current);
  const toggleFavorite = () => {
    if (current && !favoriteBusy) onToggleFavorite?.(current.id, current.isFavorited);
  };
  const copyImage = async () => {
    if (!current || current.mediaKind !== "image" || copyingImage) return;
    setCopyResult(null);
    setCopyingImage(true);
    try {
      const image = loadImageAsPng(mediaUrl(current.id));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
      if (current.id === lastViewedId.current) setCopyResult({ mediaId: current.id });
      showToast.success(t("Image copied"));
    } catch (error) {
      showToast.error(
        t("Could not copy the image."),
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setCopyingImage(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="media-lightbox media-preview-dialog"
      aria-label={t("Media viewer")}
      onCancel={(event) => {
        event.preventDefault();
        if (!albumDialogOpen) close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onKeyDown={(event) => {
        if (albumDialogOpen) return;
        if (event.target instanceof Element && event.target.closest("video, input, textarea")) return;
        if (event.key === "ArrowLeft" && slideCount > 1) {
          event.preventDefault();
          api?.scrollPrev();
        } else if (event.key === "ArrowRight" && slideCount > 1) {
          event.preventDefault();
          api?.scrollNext();
        }
      }}
    >
      <button
        ref={closeRef}
        type="button"
        className="viewer-icon-btn media-lightbox__close"
        aria-label={t("Close image preview")}
        title={t("Close image preview")}
        onClick={close}
      >
        <X size={20} aria-hidden="true" />
      </button>
      {current ? <div className="media-preview-dialog__actions">
        <DownloadButton
          media={[current]}
          includeDeleted={Boolean(trashActions)}
          className="viewer-icon-btn media-preview-dialog__action"
        />
        {trashActions ? <>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="viewer-icon-btn media-preview-dialog__action"
              aria-label={t("Restore")}
              title={t("Restore")}
              onClick={() => trashActions.onRestore(current.id)}
            >
              <RotateCcw size={20} aria-hidden="true" />
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="viewer-icon-btn media-preview-dialog__action"
              aria-label={t("Permanently delete")}
              title={t("Permanently delete")}
              onClick={() => trashActions.onDelete(current.id)}
            >
              <Trash2 size={20} aria-hidden="true" />
            </button>
          </AnimateIcon>
        </> : <>
        {current.mediaKind === "image" ? (
          <CopyButton
            content={mediaUrl(current.id)}
            copied={imageCopied}
            type="button"
            className="viewer-icon-btn media-preview-dialog__action"
            aria-label={t(imageCopied ? "Image copied" : "Copy image")}
            title={t(imageCopied ? "Image copied" : "Copy image")}
            aria-busy={copyingImage || undefined}
            disabled={copyingImage}
            onClick={(event) => {
              // Image copying replaces the primitive's default text write.
              event.preventDefault();
              void copyImage();
            }}
          >
            <CopyButtonIcon
              icon={copyingImage ? (
                <LoaderCircle size={20} animate={false} className="spinner__wheel" aria-hidden="true" />
              ) : (
                <Copy size={20} animate={false} aria-hidden="true" />
              )}
              copiedIcon={<Check size={20} animate={false} aria-hidden="true" />}
              aria-hidden="true"
            />
          </CopyButton>
        ) : null}
        <MediaFavoriteButton
          key={current.id}
          isFavorited={current.isFavorited}
          busy={favoriteBusy}
          onToggle={toggleFavorite}
        />
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <button
            ref={albumButtonRef}
            type="button"
            className="viewer-icon-btn media-preview-dialog__action"
            aria-label={t("Save to album")}
            title={t("Save to album")}
            aria-pressed={inAlbum}
            aria-busy={albums.isPending || undefined}
            onClick={() => setAlbumDialogOpen(true)}
          >
            <Bookmark
              size={20}
              stroke={inAlbum ? "var(--notification-icon)" : "currentColor"}
              fill={inAlbum ? "var(--notification-icon)" : "none"}
              aria-hidden="true"
            />
          </button>
        </AnimateIcon>
        </>}
        {!trashActions && current.mediaKind === "image" ? (
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="viewer-icon-btn media-preview-dialog__action"
              aria-label={t(current.location ? "View photo location" : "Set photo location")}
              title={t(current.location ? "View photo location" : "Set photo location")}
              onClick={() => {
                onClose(current.id);
                const parameter = current.location ? "focusMediaId" : "mediaId";
                navigate(`/location/travel?${parameter}=${encodeURIComponent(current.id)}`);
              }}
            >
              <MapPin
                size={20}
                stroke="currentColor"
                aria-hidden="true"
              />
            </button>
          </AnimateIcon>
        ) : null}
      </div> : null}
      <div
        className="media-preview-dialog__content"
        data-slot="carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label={t("Media viewer")}
      >
        <div ref={carouselRef} className="media-preview-dialog__viewport" data-slot="carousel-content">
          <div className="media-preview-dialog__track">
            {media.map((item, index) => (
              <div
                key={item.id}
                className="media-preview-dialog__item"
                data-slot="carousel-item"
                role="group"
                aria-roledescription="slide"
                aria-label={t("Media {current} of {total}", { current: index + 1, total })}
              >
                <PreviewSlide media={item} active={item.id === current?.id} includeDeleted={Boolean(trashActions)} onFavorite={toggleFavorite} />
              </div>
            ))}
            {hasMore ? (
              <div
                className="media-preview-dialog__item"
                data-slot="carousel-item"
                role="group"
                aria-roledescription="slide"
                aria-label={t("Media {current} of {total}", { current: media.length + 1, total })}
              >
                <div className="media-preview-dialog__stage" aria-busy={loadingMore}>
                  {loadMoreError ? (
                    <ErrorState message={t("Could not load more media.")} onRetry={onLoadMore} />
                  ) : <Spinner label={t("Loading more media…")} />}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {total > 1 ? (
          <div className="media-preview-dialog__controls">
            {!hasMore && total <= MAX_DOTS ? (
              <div className="media-preview-dialog__dots">
                <CarouselDots />
              </div>
            ) : null}
            <CarouselCounter
              className="media-preview-dialog__counter"
              format={(index) => <>{index} / {total}</>}
            />
          </div>
        ) : null}
      </div>
      {albumDialogOpen && current ? (
        <Suspense fallback={null}>
          <SaveToAlbumDialog
            mediaIds={[current.id]}
            portalContainer={dialogRef.current}
            onClose={() => {
              setAlbumDialogOpen(false);
              albumButtonRef.current?.focus();
            }}
          />
        </Suspense>
      ) : null}
    </dialog>
  );
}
