import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from "react";

interface SelectionDrag {
  pointerId: number;
  startX: number;
  startY: number;
  startMediaId: string;
  lastMediaId: string;
  active: boolean;
  holdTimer: ReturnType<typeof setTimeout> | null;
}

function mediaIdAt(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>("[data-media-id]")?.dataset.mediaId ?? null;
}

export function useMediaSelectionDrag(enabled: boolean, selectionMode: boolean, onSelect: (mediaId: string) => void) {
  const drag = useRef<SelectionDrag | null>(null);
  const suppressClick = useRef(false);
  const suppressClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  const clearSuppressClick = useCallback(() => {
    suppressClick.current = false;
    if (suppressClickTimer.current !== null) clearTimeout(suppressClickTimer.current);
    suppressClickTimer.current = null;
  }, []);

  const endDrag = useCallback(() => {
    if (drag.current && drag.current.holdTimer !== null) clearTimeout(drag.current.holdTimer);
    if (drag.current?.active) {
      suppressClick.current = true;
      suppressClickTimer.current = setTimeout(clearSuppressClick, 0);
    }
    drag.current = null;
  }, [clearSuppressClick]);

  useEffect(() => {
    if (!enabled) {
      drag.current = null;
      clearSuppressClick();
    }
    return () => {
      drag.current = null;
      clearSuppressClick();
    };
  }, [enabled, clearSuppressClick]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!enabled || !event.isPrimary || event.button !== 0) return;
    const mediaId = mediaIdAt(event.target);
    if (!mediaId) return;
    clearSuppressClick();
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startMediaId: mediaId,
      lastMediaId: mediaId,
      active: false,
      holdTimer: null,
    };
    if (!selectionMode) {
      drag.current.holdTimer = setTimeout(() => {
        const current = drag.current;
        if (!current || current.startMediaId !== mediaId) return;
        current.holdTimer = null;
        current.active = true;
        suppressClick.current = true;
        selectRef.current(mediaId);
      }, 500);
    }
  }, [enabled, selectionMode, clearSuppressClick]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!enabled || !current || current.pointerId !== event.pointerId) return;
    if (!current.active) {
      if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) <= 8) return;
      if (current.holdTimer !== null) {
        clearTimeout(current.holdTimer);
        current.holdTimer = null;
        suppressClick.current = true;
        suppressClickTimer.current = setTimeout(clearSuppressClick, 0);
        drag.current = null;
        return;
      }
      current.active = true;
      selectRef.current(current.startMediaId);
    }

    const target = event.currentTarget.ownerDocument.elementFromPoint?.(event.clientX, event.clientY) ?? event.target;
    const mediaId = mediaIdAt(target);
    if (!mediaId) {
      current.lastMediaId = "";
      return;
    }
    if (mediaId !== current.lastMediaId) {
      selectRef.current(mediaId);
      current.lastMediaId = mediaId;
    }
  }, [enabled]);

  const onClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!suppressClick.current) return;
    clearSuppressClick();
    event.preventDefault();
    event.stopPropagation();
  }, [clearSuppressClick]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onClickCapture,
  };
}
