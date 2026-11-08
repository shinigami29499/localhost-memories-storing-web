import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { Particles, ParticlesEffect } from "@animate-ui/react/primitives/effects/particles";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
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
import { Heart } from "@/components/animate-ui/icons/heart";
import { MapPin } from "@/components/animate-ui/icons/map-pin";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { mediaService } from "../services/mediaService";
import { ConfirmationDialog, ErrorState, showToast, Spinner } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAlbums } from "../../albums/hooks/useAlbums";
import { mediaPreviewUrl, mediaUrl } from "../../../utils/media";
import type { MediaFile } from "../types";
import { VideoPlayer } from "./VideoPlayer";
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
  preloadOriginal: boolean;
  includeDeleted: boolean;
  favoriteBurst: number | null;
  onFavoriteBurstEnd: (revision: number) => void;
}

function PreviewSlide({ media, active, preloadOriginal, includeDeleted, favoriteBurst, onFavoriteBurstEnd }: SlideProps) {
  const { t } = useLocale();
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { margin: "200px 0px" });
  const previewUrl = mediaPreviewUrl(media.id, includeDeleted);
  const originalUrl = mediaUrl(media.id, includeDeleted);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const [loadedOriginalUrl, setLoadedOriginalUrl] = useState<string | null>(null);
  const reduceMotion = useShouldReduceMotion();
  const handleOriginalLoad = useCallback((image: HTMLImageElement) => {
    setLoadedOriginalUrl(originalUrl);
    stageRef.current?.style.setProperty("--media-aspect", String(image.naturalWidth / image.naturalHeight));
  }, [originalUrl]);
  const handlePreviewError = useCallback(() => {
    setFailedUrls((current) => new Set(current).add(previewUrl));
  }, [previewUrl]);
  const handleOriginalError = useCallback(() => {
    setFailedUrls((current) => new Set(current).add(originalUrl));
  }, [originalUrl]);

return (
    <div ref={stageRef} className="media-preview-dialog__stage" data-active={active}>
      {!active && !inView ? null : failedUrls.has(previewUrl) && !active ? (
        <p role={active ? "alert" : undefined}>{t("Could not load this media.")}</p>
      ) : media.mediaKind === "video" && active ? (
        <VideoPlayer key={originalUrl} src={originalUrl} name={media.originalFilename} onError={() => setFailedUrls((current) => new Set(current).add(originalUrl))} />
      ) : (
        <>
          <img
            className="media-preview-dialog__preview-image"
            src={previewUrl}
            alt={media.originalFilename}
            loading={active ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            onLoad={(event) => event.currentTarget.style.setProperty("--media-aspect", String(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight))}
            onError={handlePreviewError}
          />
          {active && media.mediaKind === "image" && loadedOriginalUrl === originalUrl ? (
            <img
              className="media-preview-dialog__original-image"
              src={originalUrl}
              alt={media.originalFilename}
              decoding="async"
              draggable={false}
              onLoad={(event) => event.currentTarget.style.setProperty("--media-aspect", String(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight))}
              onError={handleOriginalError}
            />
          ) : null}
          {(active || preloadOriginal) && media.mediaKind === "image" && loadedOriginalUrl !== originalUrl ? (
            <OriginalImageLoader
              key={originalUrl}
              src={originalUrl}
              onLoad={handleOriginalLoad}
              onError={handleOriginalError}
            />
          ) : null}
        </>
      )}
      {active && favoriteBurst !== null ? (
        <span key={favoriteBurst} className="media-preview-dialog__heart-burst" aria-hidden="true" onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) onFavoriteBurstEnd(favoriteBurst);
        }}>
          <Particles animate={!reduceMotion}>
            <span className="media-preview-dialog__heart-burst-icon">
              <Heart size={96} fill="currentColor" style={{ color: "var(--heart-active)" }} animate={false} />
            </span>
            <ParticlesEffect style={{ top: "50%", left: "50%" }} className="media-preview-dialog__favorite-particle" />
          </Particles>
        </span>
      ) : null}
    </div>
  );
}

function OriginalImageLoader({ src, onLoad, onError }: {
  src: string;
  onLoad: (image: HTMLImageElement) => void;
  onError: () => void;
}) {
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  onLoadRef.current = onLoad;
  onErrorRef.current = onError;
  useEffect(() => {
    const loadedImage = new Image();
    let cancelled = false;
    loadedImage.decoding = "async";
    loadedImage.onload = () => {
      void loadedImage.decode().catch(() => undefined).then(() => {
        if (!cancelled) onLoadRef.current(loadedImage);
      });
    };
    loadedImage.onerror = () => onErrorRef.current();
    loadedImage.src = src;
    return () => {
      cancelled = true;
      loadedImage.onload = null;
      loadedImage.onerror = null;
    };
  }, [src]);

  return null;
}

export function MediaPreviewDialog({
  media, initialMediaId, total = media.length, loadingMore = false, loadMoreError = false,
  onLoadMore, favoriteBusy = false, onToggleFavorite, onClose, trashActions,
}: Props) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteMediaId, setDeleteMediaId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
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
  const [favoriteBurst, setFavoriteBurst] = useState<{ mediaId: string; revision: number } | null>(null);
  const favoriteBurstRevision = useRef(0);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const hasMore = Boolean(onLoadMore) && media.length < total;
  const loop = !hasMore && media.length >= (isMobile ? 3 : 5);
  const slideCount = media.length + (hasMore ? 1 : 0);
  const [carouselRef, api] = useEmblaCarousel({
    startIndex: selectedIndex,
    loop,
    align: "center",
    containScroll: false,
    scale: 0.8,
    visible: isMobile || slideCount === 1 ? 1 : 3,
    watchDrag: (_api, event) => !(event.target instanceof Element && event.target.closest(".video-player")),
  });
  const current = media[selectedIndex];
  const currentIndex = selectedIndex;
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
    if (hasMore && currentIndex >= media.length && !loadingMore && !loadMoreError) {
      onLoadMore?.();
    }
  }, [hasMore, currentIndex, media.length, loadingMore, loadMoreError, onLoadMore]);

  useLayoutEffect(() => {
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
    api.on("settle", update).on("reInit", restoreSelection);
    return () => {
      api.off("settle", update).off("reInit", restoreSelection);
    };
  }, [api]);

  if (media.length === 0) return null;

  const close = () => {
    const dialog = dialogRef.current;
    if (!dialog || closingRef.current) return;
    closingRef.current = true;
    onClose(lastViewedId.current);
  };
  const toggleFavorite = () => {
    if (!current || favoriteBusy) return;
    if (!current.isFavorited) {
      favoriteBurstRevision.current += 1;
      setFavoriteBurst({ mediaId: current.id, revision: favoriteBurstRevision.current });
    }
    onToggleFavorite?.(current.id, current.isFavorited);
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
        if (!albumDialogOpen && !deleteMediaId) close();
      }}
      onClick={(event) => {
        if (albumDialogOpen || deleteMediaId) return;
        const target = event.target;
        if (target === event.currentTarget || (target instanceof Element && target.matches(
          ".media-preview-dialog__content, .media-preview-dialog__viewport, .media-preview-dialog__track, .media-preview-dialog__item, .media-preview-dialog__stage",
        ))) close();
      }}
      onKeyDown={(event) => {
        if (albumDialogOpen || deleteMediaId) return;
        if (event.target instanceof Element && event.target.closest(".video-player, input, textarea")) return;
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
              className="viewer-icon-btn media-preview-dialog__action media-preview-dialog__trash-action"
              aria-label={t("Permanently delete")}
              title={t("Permanently delete")}
              onClick={() => trashActions.onDelete(current.id)}
            >
              <Trash2 size={20} aria-hidden="true" />
            </button>
          </AnimateIcon>
        </> : <>
        {current.mediaKind === "image" ? (
          <AnimateIcon animateOnHover completeOnStop asChild>
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
                  <LoaderCircle size={20} className="spinner__wheel" aria-hidden="true" />
                ) : (
                  <Copy size={20} aria-hidden="true" />
                )}
                copiedIcon={<Check size={20} aria-hidden="true" />}
                aria-hidden="true"
              />
            </CopyButton>
          </AnimateIcon>
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
            className="viewer-icon-btn media-preview-dialog__action media-preview-dialog__album-action"
            aria-label={t("Save to album")}
            title={t("Save to album")}
            aria-pressed={inAlbum}
            aria-busy={albums.isPending || undefined}
            onClick={() => setAlbumDialogOpen(true)}
          >
            <Bookmark
              size={20}
              fill={inAlbum ? "currentColor" : "none"}
              style={{ color: inAlbum ? "var(--bookmark-active)" : "inherit" }}
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
        {!trashActions ? (
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="viewer-icon-btn media-preview-dialog__action media-preview-dialog__trash-action"
              aria-label={t("Move to trash")}
              title={t("Move to trash")}
              onClick={() => setDeleteMediaId(current.id)}
            >
              <Trash2 size={20} aria-hidden="true" />
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
            {media.map((item, index) => {
              const distance = Math.abs(index - currentIndex);
              const nearbyDistance = loop ? Math.min(distance, media.length - distance) : distance;
              return (
              <div
                key={item.id}
                className="media-preview-dialog__item"
                data-slot="carousel-item"
                role="group"
                aria-roledescription="slide"
                aria-label={t("Media {current} of {total}", { current: index + 1, total })}
              >
                <PreviewSlide
                  media={item}
                  active={item.id === current?.id}
                  preloadOriginal={nearbyDistance <= 2}
                  includeDeleted={Boolean(trashActions)}
                  favoriteBurst={favoriteBurst?.mediaId === item.id ? favoriteBurst.revision : null}
                  onFavoriteBurstEnd={(revision) => setFavoriteBurst((currentBurst) =>
                    currentBurst?.mediaId === item.id && currentBurst.revision === revision ? null : currentBurst)}
                />
              </div>
              );
            })}
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
          <div className="media-preview-dialog__controls">
            {!hasMore && total > 1 && total <= MAX_DOTS ? (
              <div className="media-preview-dialog__dots">
                <CarouselDots />
              </div>
            ) : null}
            <CarouselCounter
              className="media-preview-dialog__counter"
              format={(current) => <>{current} {t("of {total}", { total })}</>}
            />
          </div>
      </div>
      {deleteMediaId ? (
        <ConfirmationDialog
          title="Move selected media to trash?"
          confirmLabel="Move to trash"
          danger
          portalContainer={dialogRef.current}
          onClose={() => setDeleteMediaId(null)}
          onConfirm={async () => {
            const mediaId = deleteMediaId;
            await mediaService.remove(mediaId);
            showToast.delete(t("Media moved to trash"), {
              undo: async () => {
                await mediaService.restore(mediaId);
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["media"] }),
                  queryClient.invalidateQueries({ queryKey: ["albums"] }),
                ]);
              },
            });
            return () => {
              onClose(mediaId);
              void queryClient.invalidateQueries({ queryKey: ["media"] });
              void queryClient.invalidateQueries({ queryKey: ["albums"] });
            };
          }}
        >
          <p>{media.find((item) => item.id === deleteMediaId)?.originalFilename}</p>
          {t("Selected media will move to trash and can be restored later.")}
        </ConfirmationDialog>
      ) : null}
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
