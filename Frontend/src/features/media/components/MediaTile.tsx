import { useCallback, useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Checkbox as CheckboxPrimitive } from "@animate-ui/react/primitives/base-ui/checkbox";
import { Check } from "@/components/animate-ui/icons/check";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import type { MediaFile } from "../types";
import { useMediaRetry } from "./MediaRetryProvider";

interface Props {
  media: MediaFile;
  selectionMode: boolean;
  selectionEnabled?: boolean;
  selected: boolean;
  favoriteDisabled?: boolean;
  includeDeleted?: boolean;
  onSelect: (mediaId: string) => void;
  onOpen: (mediaId: string) => void;
  onFavorite?: (mediaId: string) => void;
}

export function MediaTile({
  media, selectionMode, selectionEnabled = true, selected, favoriteDisabled, includeDeleted = false, onSelect, onOpen, onFavorite,
}: Props) {
  const { t } = useLocale();
  const retryGroup = useMediaRetry();
  const registerRetry = retryGroup?.register;
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
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
  const url = mediaPreviewUrl(media.id, includeDeleted);
  const previewUrl = `${url}${attempt ? `${url.includes("?") ? "&" : "?"}previewRetry=${attempt}` : ""}`;
  const tileRef = useRef<HTMLButtonElement>(null);
  const inView = useInView(tileRef, { margin: "200px 0px" });
  const shouldReduceMotion = useShouldReduceMotion();
  const isSelecting = selectionEnabled && selectionMode;
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const latest = useRef({ isSelecting, onSelect, onOpen });
  latest.current = { isSelecting, onSelect, onOpen };

  const clearClick = () => {
    if (clickTimer.current !== null) clearTimeout(clickTimer.current);
    clickTimer.current = null;
  };
  const clearHold = () => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    origin.current = null;
  };

  useEffect(() => () => {
    clearClick();
    clearHold();
  }, []);

  useEffect(() => {
    clearClick();
    clearHold();
  }, [isSelecting]);

  const favorite = () => {
    clearClick();
    if (failedRef.current || pendingRetry.current) return;
    if (!includeDeleted && !isSelecting && !favoriteDisabled && !media.isFavorited) onFavorite?.(media.id);
  };

  return (
    <AnimateIcon
      animate={shouldReduceMotion ? false : undefined}
      animateOnHover
      animateOnTap
      completeOnStop
      asChild
    >
      <button
        ref={tileRef}
        type="button"
        className={`media-tile${isSelecting && selected ? " media-tile--selected" : ""}`}
        data-media-id={media.id}
        aria-label={t(isSelecting ? "Select {filename}" : failed || retrying
          ? "Retry all failed media, starting with {filename}" : "Open {filename}", { filename: media.originalFilename })}
        aria-disabled={!isSelecting && (failed || retrying) && (retryGroup?.busy || retrying) || undefined}
        title={(failed || retrying) && !isSelecting
          ? t("Retry all failed media, starting with {filename}", { filename: media.originalFilename }) : undefined}
        aria-busy={retrying || undefined}
        aria-pressed={isSelecting ? selected : undefined}
        aria-description={t(selectionEnabled
          ? includeDeleted ? "Hold to select, or press Shift+Space." : "Hold to select, or press Shift+Space. Double-click or press F to add to favorites."
          : includeDeleted ? "Open media preview." : "Double-click or press F to add to favorites.")}
        onPointerDown={(event) => {
          clearHold();
          if (!event.isPrimary || event.button !== 0) return;
          clearClick();
          suppressClick.current = false;
          if (!selectionEnabled) return;
          origin.current = { x: event.clientX, y: event.clientY };
          holdTimer.current = setTimeout(() => {
            suppressClick.current = true;
            clearClick();
            clearHold();
            latest.current.onSelect(media.id);
          }, 500);
        }}
        onPointerMove={(event) => {
          if (origin.current && Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 10) {
            suppressClick.current = true;
            clearClick();
            clearHold();
          }
        }}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={() => {
          suppressClick.current = true;
          clearClick();
          clearHold();
        }}
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
        onBlur={() => {
          clearClick();
          clearHold();
        }}
        onKeyDown={(event) => {
          if (selectionEnabled && event.shiftKey && event.key === " ") {
            event.preventDefault();
            clearClick();
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
          clearClick();
          if (isSelecting) {
            onSelect(media.id);
          } else if (retrying || (failed && retryGroup?.busy)) {
            return;
          } else if (failed) {
            if (retryGroup) void retryGroup.retryAll(media.id);
            else void retryPreview();
          } else if (event.detail === 0 || includeDeleted) {
            onOpen(media.id);
          } else if (event.detail === 1) {
            // Wait for a possible double-click before opening the modal.
            clickTimer.current = setTimeout(() => {
              clickTimer.current = null;
              if (latest.current.isSelecting) latest.current.onSelect(media.id);
              else if (!failedRef.current && !pendingRetry.current) latest.current.onOpen(media.id);
            }, 350);
          }
        }}
        onDoubleClick={favorite}
      >
      {isSelecting ? (
        <CheckboxPrimitive.Root
          className="media-tile__selection"
          checked={selected}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
        >
          <CheckboxPrimitive.Indicator className="media-tile__selection-indicator">
            <Check size={14} />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
      ) : null}
      <span className="media-tile__motion">
        {failed || (!inView && !retrying) ? null : (
          <img key={attempt} className="media-tile__preview" src={previewUrl} onLoad={() => finishPreview(false)} onError={() => finishPreview(true)} alt="" loading={retrying ? "eager" : "lazy"} decoding="async" draggable={false} />
        )}
      </span>
      {failed || retrying ? (
        <span className="media-tile__retry" aria-hidden="true">
          {retrying
            ? <LoaderCircle size={24} className="spinner__wheel" />
            : <RotateCcw size={24} />}
        </span>
      ) : null}
      </button>
    </AnimateIcon>
  );
}
