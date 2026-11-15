import { useInView } from "motion/react";
import { useCallback,useEffect,useLayoutEffect,useRef,useState } from "react";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import type { MediaFile } from "../types";
import { useGalleryLoadingAllowed } from "./GalleryLoadingProvider";
import { useMediaRetry } from "./MediaRetryProvider";

export interface MediaTileProps {
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

export function useMediaTile({
  media, selectionMode, selectionEnabled = true, selectionDragEnabled = false, selected, favoriteDisabled, includeDeleted = false, preload = false, onSelect, onOpen, onFavorite, onUnavailable,
}: MediaTileProps) {
  const { t } = useLocale();
  const [authorPrefix, authorSuffix] = t("by {username}").split("{username}");
  const tileRef = useRef<HTMLButtonElement>(null);
  const inView = useInView(tileRef, { margin: "200px 0px" });
  const loadingAllowed = useGalleryLoadingAllowed();
  const [requestedId, setRequestedId] = useState<string | null>(null);
  useEffect(() => {
    if (!inView && !preload) setRequestedId(null);
    else if (loadingAllowed) setRequestedId(media.id);
  }, [inView, preload, loadingAllowed, media.id]);
  const city = media.location?.city;
  const time = new Date(media.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
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
  const currentMediaId = useRef<string | null>(media.id);
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

  useLayoutEffect(() => {
    currentMediaId.current = media.id;
    failedRef.current = false;
    pendingRetry.current?.();
    pendingRetry.current = null;
    availabilityPending.current = false;
    suppressClick.current = false;
    clearHold();
    setFailed(false);
    setRetrying(false);
    setCheckingAvailability(false);
    setAttempt(0);
    return () => { currentMediaId.current = null; };
  }, [media.id]);

  const favorite = () => {
    if (failedRef.current || pendingRetry.current) return;
    if (!includeDeleted && !isSelecting && !favoriteDisabled && !media.isFavorited) onFavorite?.(media.id);
  };

  const openUnavailable = async () => {
    if (!onUnavailable || availabilityPending.current) return;
    availabilityPending.current = true;
    setCheckingAvailability(true);
    try {
      const handled = await onUnavailable(media.id);
      if (currentMediaId.current !== media.id || handled) return;
      if (retryGroup) await retryGroup.retryAll(media.id);
      else await retryPreview();
    } catch (error) {
      showToast.error(t("Could not check media availability."), error instanceof Error ? error.message : undefined);
    } finally {
      if (currentMediaId.current === media.id) {
        availabilityPending.current = false;
        setCheckingAvailability(false);
      }
    }
  };
  const failedActionLabel = onUnavailable ? "Check unavailable media: {filename}" : "Retry all failed media, starting with {filename}";

  const interactions: React.ButtonHTMLAttributes<HTMLButtonElement> = {
    onPointerDown: (event) => {
      clearHold();
      if (!event.isPrimary || event.button !== 0) return;
      suppressClick.current = false;
      if (!selectionEnabled || selectionDragEnabled || isSelecting) return;
      origin.current = { x: event.clientX, y: event.clientY };
      holdTimer.current = setTimeout(() => { suppressClick.current = true; clearHold(); latest.current.onSelect(media.id); }, 500);
    },
    onPointerMove: (event) => {
      if (origin.current && Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 10) {
        suppressClick.current = true; clearHold();
      }
    },
    onPointerUp: clearHold,
    onPointerLeave: clearHold,
    onPointerCancel: () => { suppressClick.current = true; clearHold(); },
    onContextMenu: (event) => event.preventDefault(),
    onDragStart: (event) => event.preventDefault(),
    onBlur: clearHold,
    onKeyDown: (event) => {
      if (selectionEnabled && event.shiftKey && event.key === " ") {
        event.preventDefault(); if (!event.repeat) onSelect(media.id);
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault(); if (!event.repeat) favorite();
      }
    },
    onClick: (event) => {
      if (suppressClick.current) { suppressClick.current = false; if (event.detail !== 0) return; }
      if (isSelecting) onSelect(media.id);
      else if (checkingAvailability || retrying || (failed && retryGroup?.busy)) return;
      else if (failed) {
        if (onUnavailable) void openUnavailable();
        else if (retryGroup) void retryGroup.retryAll(media.id);
        else void retryPreview();
      } else onOpen(media.id);
    },
  };
  return { t, authorPrefix, authorSuffix, tileRef, inView, requestedId, city, time, retryGroup, failed, retrying, checkingAvailability, attempt, previewUrl, finishPreview, isSelecting, currentMediaId, failedActionLabel, interactions };
}
