import { useRef, type TouchEvent } from "react";

const MIN_DISTANCE = 48;

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipe({ onSwipeLeft, onSwipeRight }: SwipeHandlers) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (event: TouchEvent) => {
      // Native video controls own horizontal drags (seeking).
      if (event.touches.length !== 1 || event.target instanceof HTMLVideoElement) {
        start.current = null;
        return;
      }
      start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    },
    onTouchEnd: (event: TouchEvent) => {
      const origin = start.current;
      start.current = null;
      if (!origin) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - origin.x;
      const dy = touch.clientY - origin.y;
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    },
    onTouchCancel: () => {
      start.current = null;
    },
  };
}
