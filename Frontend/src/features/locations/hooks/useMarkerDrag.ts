import { useRef, useState, type PointerEvent } from "react";
import { useMap } from "react-map-gl/mapbox";

const HOLD_MS = 250;

export function useMarkerDrag(location: { latitude: number; longitude: number }, onMove: (location: { latitude: number; longitude: number }) => void, enabled = true) {
  const { current: map } = useMap();
  const gesture = useRef<{ id: number; x: number; y: number; startedAt: number; dragging: boolean; cancelled: boolean } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const suppressClick = useRef(false);

  return {
    offset,
    suppressClick,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (!enabled || !map || event.button !== 0 || !event.isPrimary) return;
      event.stopPropagation();
      suppressClick.current = false;
      gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startedAt: performance.now(), dragging: false, cancelled: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      const x = event.clientX - start.x, y = event.clientY - start.y;
      if (Math.hypot(x, y) > 8 && !start.dragging) {
        if (performance.now() - start.startedAt < HOLD_MS) {
          start.cancelled = true;
          suppressClick.current = true;
        } else if (!start.cancelled) start.dragging = true;
      }
      if (start.dragging) setOffset({ x, y });
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      gesture.current = null;
      setOffset({ x: 0, y: 0 });
      event.currentTarget.releasePointerCapture(event.pointerId);
      if (!start.dragging || !map) return;
      suppressClick.current = true;
      const origin = map.project([location.longitude, location.latitude]);
      const point = map.unproject([origin.x + event.clientX - start.x, origin.y + event.clientY - start.y]).wrap();
      onMove({ latitude: point.lat, longitude: point.lng });
    },
    onPointerCancel: () => { gesture.current = null; suppressClick.current = true; setOffset({ x: 0, y: 0 }); },
    onLostPointerCapture: () => { gesture.current = null; setOffset({ x: 0, y: 0 }); },
  };
}
