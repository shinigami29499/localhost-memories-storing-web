import { useCallback, useRef, type PointerEvent } from "react";

type Point = { x: number; y: number };
type Camera = Point & { scale: number };
type Gesture = { camera: Camera; center: Point; distance: number };

const fitted: Camera = { x: 0, y: 0, scale: 1 };
const tapRadius = 20;
const doubleTapWindow = 300;
const maxZoom = 4;

function distance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function measure(points: Map<number, Point>) {
  const [first, second] = points.values();
  return second
    ? { center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }, distance: distance(first, second) }
    : { center: first, distance: 0 };
}

export function useMobilePhotoZoom() {
  const camera = useRef(fitted);
  const stage = useRef<HTMLElement | null>(null);
  const points = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const tapStart = useRef<Point | null>(null);
  const lastTap = useRef<{ point: Point; time: number } | null>(null);

  const reset = useCallback(() => {
    stage.current?.style.removeProperty("--photo-transform");
    stage.current = null;
    camera.current = fitted;
    points.current.clear();
    gesture.current = null;
    tapStart.current = null;
    lastTap.current = null;
  }, []);

  function apply(viewport: HTMLElement, next: Camera) {
    const active = viewport.querySelector<HTMLElement>('.media-preview-dialog__stage[data-active="true"]');
    const image = active?.querySelector("img");
    if (!active || !image) return;
    const horizontal = Math.max(0, (image.clientWidth * next.scale - active.clientWidth) / 2);
    const vertical = Math.max(0, (image.clientHeight * next.scale - active.clientHeight) / 2);
    const x = Math.min(horizontal, Math.max(-horizontal, next.x));
    const y = Math.min(vertical, Math.max(-vertical, next.y));
    camera.current = { scale: next.scale, x, y };
    stage.current = active;
    active.style.setProperty("--photo-transform", `translate(${x}px, ${y}px) scale(${next.scale})`);
  }

  function zoomAt(viewport: HTMLElement, start: Camera, from: Point, to: Point, scale: number) {
    if (scale <= 1) {
      apply(viewport, fitted);
      return;
    }
    const bounds = viewport.getBoundingClientRect();
    const ratio = scale / start.scale;
    apply(viewport, {
      scale,
      x: start.x * ratio + (to.x - from.x) + (from.x - bounds.left - bounds.width / 2) * (1 - ratio),
      y: start.y * ratio + (to.y - from.y) + (from.y - bounds.top - bounds.height / 2) * (1 - ratio),
    });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || points.current.size >= 2) return;
    const point = { x: event.clientX, y: event.clientY };
    points.current.set(event.pointerId, point);
    if (points.current.size === 1) tapStart.current = point;
    else {
      tapStart.current = null;
      lastTap.current = null;
    }
    gesture.current = { camera: camera.current, ...measure(points.current) };
    if (camera.current.scale > 1) event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!points.current.has(event.pointerId) || !gesture.current) return;
    const point = { x: event.clientX, y: event.clientY };
    points.current.set(event.pointerId, point);
    if (tapStart.current && distance(tapStart.current, point) > tapRadius) {
      tapStart.current = null;
      lastTap.current = null;
    }
    const start = gesture.current;
    const current = measure(points.current);
    if (points.current.size === 1 && start.camera.scale === 1) return;
    const ratio = start.distance > 0 ? current.distance / start.distance : 1;
    const scale = Math.min(maxZoom, Math.max(1, start.camera.scale * ratio));
    zoomAt(event.currentTarget, start.camera, start.center, current.center, scale);
  }

  function endPointer(event: PointerEvent<HTMLDivElement>) {
    if (!points.current.delete(event.pointerId)) return;
    gesture.current = points.current.size ? { camera: camera.current, ...measure(points.current) } : null;
    const start = tapStart.current;
    tapStart.current = null;
    if (event.type !== "pointerup") {
      lastTap.current = null;
      return;
    }
    if (!start) return;
    const point = { x: event.clientX, y: event.clientY };
    if (distance(start, point) > tapRadius) return;
    const previous = lastTap.current;
    if (previous && event.timeStamp - previous.time <= doubleTapWindow && distance(previous.point, point) <= tapRadius) {
      zoomAt(event.currentTarget, camera.current, point, point, camera.current.scale > 1 ? 1 : 2.5);
      lastTap.current = null;
    } else {
      lastTap.current = { point, time: event.timeStamp };
    }
  }

  const canDrag = useCallback(() => camera.current.scale === 1 && points.current.size < 2, []);

  return {
    reset,
    canDrag,
    handlers: { onPointerDown, onPointerMove, onPointerUp: endPointer, onPointerCancel: endPointer, onPointerLeave: endPointer },
  };
}
