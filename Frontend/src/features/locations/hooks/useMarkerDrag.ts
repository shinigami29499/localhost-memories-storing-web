import { useRef, useState, type PointerEvent } from "react";
import { useMap } from "react-map-gl/mapbox";
import { useEffect } from "react";

export function useMarkerDrag(location: { latitude: number; longitude: number }, onMove: (location: { latitude: number; longitude: number }) => void, enabled = true, holdMs = 0) {
  const { current: map } = useMap();
  const gesture = useRef<{ id: number; x: number; y: number; dragging: boolean; armed: boolean; timer: ReturnType<typeof setTimeout> | null } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const suppressClick = useRef(false);
  const ref = useRef<HTMLButtonElement>(null);
  const clearGesture = () => {
    if (gesture.current?.timer) clearTimeout(gesture.current.timer);
    gesture.current = null;
  };

  useEffect(() => () => clearGesture(), []);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled || !map) return;
    // Mapbox handles native mouse/touch events before React's delegated handlers.
    const stopMapGesture = (event: MouseEvent | TouchEvent) => {
      if (event instanceof MouseEvent && event.button !== 0) return;
      event.stopPropagation();
    };
    element.addEventListener("mousedown", stopMapGesture);
    element.addEventListener("touchstart", stopMapGesture);
    return () => {
      element.removeEventListener("mousedown", stopMapGesture);
      element.removeEventListener("touchstart", stopMapGesture);
    };
  });

  return {
    ref,
    offset,
    suppressClick,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (!enabled || !map || event.button !== 0 || !event.isPrimary) return;
      event.stopPropagation();
      suppressClick.current = false;
      const start = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false, armed: holdMs === 0, timer: null as ReturnType<typeof setTimeout> | null };
      if (holdMs > 0) start.timer = setTimeout(() => { if (gesture.current === start) start.armed = true; }, holdMs);
      gesture.current = start;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      const x = event.clientX - start.x, y = event.clientY - start.y;
      if (!start.armed) {
        if (Math.hypot(x, y) > 8) {
          suppressClick.current = true;
          clearGesture();
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        return;
      }
      if (Math.hypot(x, y) > 8) start.dragging = true;
      if (start.dragging) setOffset({ x, y });
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      clearGesture();
      setOffset({ x: 0, y: 0 });
      event.currentTarget.releasePointerCapture(event.pointerId);
      if (!start.dragging || !map) return;
      suppressClick.current = true;
      const origin = map.project([location.longitude, location.latitude]);
      const point = map.unproject([origin.x + event.clientX - start.x, origin.y + event.clientY - start.y]).wrap();
      onMove({ latitude: point.lat, longitude: point.lng });
    },
    onPointerCancel: () => { clearGesture(); suppressClick.current = true; setOffset({ x: 0, y: 0 }); },
    onLostPointerCapture: () => { clearGesture(); setOffset({ x: 0, y: 0 }); },
  };
}
