import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Check } from "@/components/animate-ui/icons/check";
import { Copy } from "@/components/animate-ui/icons/copy";
import { Heart } from "@/components/animate-ui/icons/heart";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { MapPin } from "@/components/animate-ui/icons/map-pin";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { CopyButton,CopyButtonIcon } from "@animate-ui/react/primitives/buttons/copy";
import {
CarouselCounter,
CarouselDots,
} from "@animate-ui/react/primitives/carousel";
import { Particles,ParticlesEffect } from "@animate-ui/react/primitives/effects/particles";
import { lazy,Suspense } from "react";
import { ConfirmationDialog,ErrorState,Spinner } from "../../../components/ui";
import { mediaUrl } from "../../../utils/media";
import type { MediaFile } from "../types";
import { MediaFavoriteButton } from "./MediaFavoriteButton";
import { VideoPlayer } from "./VideoPlayer";

const SaveToAlbumDialog = lazy(() =>
  import("../../albums/components/SaveToAlbumDialog").then((module) => ({ default: module.SaveToAlbumDialog })),
);

const MAX_DOTS = 20;

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

function PreviewSlide(props: PreviewSlideProps) {
  const { media, active, preloadOriginal, favoriteBurst, onFavoriteBurstEnd } = props;
  const { t, stageRef, inView, previewUrl, originalUrl, failedUrls, setFailedUrls, loadedOriginalUrl, reduceMotion, handleOriginalLoad, handlePreviewError, handleOriginalError } = usePreviewSlide(props);

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

import { OriginalImageLoader } from "./OriginalImageLoader";
import { usePreviewSlide,type PreviewSlideProps } from "./usePreviewSlide";

import { useMediaPreviewDialog,type MediaPreviewDialogProps } from "./useMediaPreviewDialog";

export function MediaPreviewDialog(props: MediaPreviewDialogProps) {
  const { media, initialMediaId, total = media.length, loadingMore = false, loadMoreError = false, onLoadMore, favoriteBusy = false, onToggleFavorite, onClose, trashActions } = props;
  const { t, navigate, queryClient, deleteMediaId, setDeleteMediaId, dialogRef, closeRef, albumButtonRef, selectedIndex, albumDialogOpen, setAlbumDialogOpen, copyingImage, favoriteBurst, setFavoriteBurst, hasMore, loop, slideCount, carouselRef, api, current, currentIndex, albums, inAlbum, imageCopied, close, toggleFavorite, copyImage, goToLocation, closeAlbum, confirmDelete } = useMediaPreviewDialog(props);
  if (media.length === 0) return null;

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
              onClick={goToLocation}
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
                  ) : <Spinner label={t("Loading more media...")} />}
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
          onConfirm={confirmDelete}
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
            onClose={closeAlbum}
          />
        </Suspense>
      ) : null}
    </dialog>
  );
}
