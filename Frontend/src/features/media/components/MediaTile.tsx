import { Image as ImageIcon } from "@/components/animate-ui/icons/image";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { useCallback, useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Clapperboard } from "@/components/animate-ui/icons/clapperboard";
import { Check } from "@/components/animate-ui/icons/check";
import { Play } from "@/components/animate-ui/icons/play";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { useLocale } from "../../../context/LocaleContext";
import { showToast } from "../../../components/ui/Toast";
import { formatTimestamp, mediaPreviewUrl } from "../../../utils/media";
import type { MediaFile } from "../types";
import { useMediaRetry } from "./MediaRetryProvider";

interface Props {
  media: MediaFile;
  selectionMode: boolean;
  selectionEnabled?: boolean;
  selectionDragEnabled?: boolean;
  selected: boolean;
  favoriteDisabled?: boolean;
  includeDeleted?: boolean;
  preload?: boolean;
  onSelect: (mediaId: string) => void;
  onOpen: (mediaId: string) => void;
  onFavorite?: (mediaId: string) => void;
  /** Return true when unavailable media was handled instead of retried. */
  onUnavailable?: (mediaId: string) => Promise<boolean>;
}

export function MediaTile({
  media, selectionMode, selectionEnabled = true, selectionDragEnabled = false, selected, favoriteDisabled, includeDeleted = false, preload = false, onSelect, onOpen, onFavorite, onUnavailable,
}: Props) {
  const { t, language } = useLocale();
  const tileRef = useRef<HTMLButtonElement>(null);
  const inView = useInView(tileRef, { margin: "200px 0px" });
  const retryGroup = useMediaRetry();
  const registerRetry = retryGroup?.register;
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const availabilityPending = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const previewUrl = `${mediaPreviewUrl(media.id, includeDeleted)}${attempt ? `&previewRetry=${attempt}` : ""}`;
  const failedRef = useRef(false);
  const pendingRetry = useRef<(() => void) | null>(null);
  const finishPreview = useCallback((hasFailed: boolean) => {
    failedRef.current = hasFailed;
    setFailed(hasFailed);
    setRetrying(false);
    pendingRetry.current?.();
    pendingRetry.current = null;
  }, []);
  const retryPreview = useCallback(() => new Promise<void>((resolve) => {
    pendingRetry.current = resolve;
    failedRef.current = false;
    setFailed(false);
    setRetrying(true);
    setAttempt((current) => current + 1);
  }), []);
  useEffect(() => registerRetry?.(media.id, {
    isFailed: () => failedRef.current,
    retry: retryPreview,
  }), [registerRetry, media.id, retryPreview]);
  useEffect(() => () => {
    pendingRetry.current?.();
    pendingRetry.current = null;
  }, []);
  useEffect(() => {
    if (!retrying) return;
    // A stalled media request must not block every remaining preview.
    const timeout = setTimeout(() => finishPreview(true), 30000);
    return () => clearTimeout(timeout);
  }, [retrying, finishPreview]);
  const isSelecting = selectionEnabled && selectionMode;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const latest = useRef({ onSelect });
  latest.current = { onSelect };

  const clearHold = () => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    origin.current = null;
  };

  useEffect(() => () => {
    clearHold();
  }, []);

  useEffect(() => {
    clearHold();
  }, [isSelecting]);

  const favorite = () => {
    if (failedRef.current || pendingRetry.current) return;
    if (!includeDeleted && !isSelecting && !favoriteDisabled && !media.isFavorited) onFavorite?.(media.id);
  };

  const openUnavailable = async () => {
    if (!onUnavailable || availabilityPending.current) return;
    availabilityPending.current = true;
    setCheckingAvailability(true);
    try {
      if (await onUnavailable(media.id)) return;
      if (retryGroup) await retryGroup.retryAll(media.id);
      else await retryPreview();
    } catch (error) {
      showToast.error(t("Could not check media availability."), error instanceof Error ? error.message : undefined);
    } finally {
      availabilityPending.current = false;
      setCheckingAvailability(false);
    }
  };
  const failedActionLabel = onUnavailable ? "Check unavailable media: {filename}" : "Retry all failed media, starting with {filename}";

  return (
    <AnimateIcon asChild animateOnHover animateOnTap completeOnStop>
      <button
        ref={tileRef}
        type="button"
        className={`media-tile${isSelecting && selected ? " media-tile--selected" : ""}`}
        data-media-id={media.id}
        aria-label={t(isSelecting ? "Select {filename}" : failed || retrying
          ? failedActionLabel : "Open {filename}", { filename: media.originalFilename })}
        aria-disabled={!isSelecting && (checkingAvailability || (failed || retrying) && (retryGroup?.busy || retrying)) || undefined}
        title={(failed || retrying) && !isSelecting
          ? t(failedActionLabel, { filename: media.originalFilename }) : undefined}
        aria-busy={retrying || checkingAvailability || undefined}
        aria-pressed={isSelecting ? selected : undefined}
        aria-description={t(selectionEnabled
          ? includeDeleted ? "Hold to select, or press Shift+Space." : "Hold to select, or press Shift+Space. Press F to add to favorites."
          : includeDeleted ? "Open media preview." : "Press F to add to favorites.")}
        onPointerDown={(event) => {
          clearHold();
          if (!event.isPrimary || event.button !== 0) return;
          suppressClick.current = false;
          if (!selectionEnabled || selectionDragEnabled || isSelecting) return;
          origin.current = { x: event.clientX, y: event.clientY };
          holdTimer.current = setTimeout(() => {
            suppressClick.current = true;
            clearHold();
            latest.current.onSelect(media.id);
          }, 500);
        }}
        onPointerMove={(event) => {
          if (origin.current && Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 10) {
            suppressClick.current = true;
            clearHold();
          }
        }}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={() => {
          suppressClick.current = true;
          clearHold();
        }}
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
        onBlur={() => {
          clearHold();
        }}
        onKeyDown={(event) => {
          if (selectionEnabled && event.shiftKey && event.key === " ") {
            event.preventDefault();
            if (!event.repeat) onSelect(media.id);
          } else if (event.key.toLowerCase() === "f") {
            event.preventDefault();
            if (!event.repeat) favorite();
          }
        }}
        onClick={(event) => {
          if (suppressClick.current) {
            suppressClick.current = false;
            if (event.detail !== 0) return;
          }
          if (isSelecting) {
            onSelect(media.id);
          } else if (checkingAvailability || retrying || (failed && retryGroup?.busy)) {
            return;
          } else if (failed) {
            if (onUnavailable) void openUnavailable();
            else if (retryGroup) void retryGroup.retryAll(media.id);
            else void retryPreview();
          } else onOpen(media.id);
        }}
      >
      {isSelecting ? (
        <span className="media-tile__selection" aria-hidden="true">
          <span className="media-tile__selection-indicator">
            {selected ? (
              <Check size={14} animate={false} aria-hidden="true" />
            ) : null}
          </span>
        </span>
      ) : null}
      <span className="media-tile__motion">
        {failed || (!inView && !retrying && !preload) ? null : (
          <img key={attempt} className="media-tile__preview" src={previewUrl} onLoad={() => finishPreview(false)} onError={() => finishPreview(true)} alt="" loading={retrying || preload ? "eager" : "lazy"} decoding="async" draggable={false} />
        )}
      </span>
      {media.mediaKind === "video" && !failed && !retrying ? (
        <>
          <span className="media-tile__play" aria-hidden="true"><Play size={24} /></span>
        </>
      ) : null}
      <span className="media-tile__info">
        <span className="media-tile__owner">
          <UserAvatar user={{ id: media.ownerId ?? media.ownerUsername ?? "unknown", username: media.ownerUsername ?? undefined, avatarSeed: media.ownerAvatarSeed }} className="media-tile__avatar" />
          <span className="media-tile__by">{t("By {username}", { username: media.ownerUsername || t("Unknown") })}</span>
        </span>
        <span className="media-tile__details">
          <time dateTime={media.createdAt}>{formatTimestamp(media.createdAt, language)}</time>
          <span role="img" aria-label={t(media.mediaKind === "video" ? "Video" : "Image")}>
            {media.mediaKind === "video" ? <Clapperboard size={16} /> : <ImageIcon size={16} />}
          </span>
        </span>
      </span>
      {failed || retrying ? (
        <span className="media-tile__retry" aria-hidden="true">
          {retrying || checkingAvailability
            ? <LoaderCircle size={24} className="spinner__wheel" />
            : <RotateCcw size={24} />}
        </span>
      ) : null}
      </button>
    </AnimateIcon>
  );
}
