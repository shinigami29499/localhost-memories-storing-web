// @vitest-environment jsdom
import { act, useRef, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { HomeLocationMarker } from "../../../../../../src/features/locations/components/HomeLocationMarker";
import { MapDraftMarker } from "../../../../../../src/features/locations/components/MapDraftMarker";
import { MobileHomeLocationMarker } from "../../../../../../apps/mobile/src/places/MobileHomeLocationMarker";
import { MobileMapDraftMarker } from "../../../../../../apps/mobile/src/places/MobileMapDraftMarker";

const clear = vi.hoisted(() => vi.fn());
vi.mock("react-map-gl/mapbox", () => ({
  useMap: () => ({}),
  Marker: ({ children, onDragEnd }: { children: ReactNode; onDragEnd?: (event: unknown) => void }) => <div>{children}
    {onDragEnd && <button data-drag-end onClick={() => onDragEnd({ lngLat: { wrap: () => ({ lat: -12, lng: 45 }) } })}>Drag end</button>}</div>,
}));
vi.mock("../../../../../../src/features/locations/hooks/useHomeLocation", () => ({ useHomeLocation: () => ({ save: { isPending: false }, clear: { isPending: false, mutateAsync: clear } }) }));
vi.mock("../../../../../../src/features/locations/hooks/useMarkerDrag", () => ({ useMarkerDrag: () => ({ ref: useRef(null), suppressClick: useRef(false), offset: { x: 0, y: 0 },
  onPointerDown: vi.fn(), onPointerMove: vi.fn(), onPointerUp: vi.fn(), onPointerCancel: vi.fn(), onLostPointerCapture: vi.fn() }) }));
vi.mock("../../../../../../src/components/animate-ui/icons/icon", () => ({ AnimateIcon: ({ children }: { children: ReactNode }) => children }));
vi.mock("../../../../../../src/components/animate-ui/icons/home", () => ({ Home: () => <svg /> }));
vi.mock("../../../../../../src/components/ui", () => ({
  showToast: { delete: vi.fn() },
  ConfirmationDialog: ({ onClose }: { onClose: () => void }) => <div role="dialog"><button onClick={onClose}>Cancel</button></div>,
}));
vi.mock("../../../../../../apps/mobile/src/gallery/MobileConfirmationDialog", () => ({
  MobileConfirmationDialog: ({ onClose }: { onClose: () => void }) => <div role="dialog"><button onClick={onClose}>Cancel</button></div>,
}));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

it.each([["web", HomeLocationMarker], ["mobile", MobileHomeLocationMarker]] as const)("%s home marker opens and cancels long-press removal", async (_, Marker) => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onClick = vi.fn();
  await act(async () => root.render(<Marker location={{ latitude: 10, longitude: 20 }} variant="place" onClick={onClick} />));
  const pin = container.querySelector<HTMLButtonElement>('[aria-label="Home location"]')!;
  const down = new MouseEvent("pointerdown", { bubbles: true, button: 0 });
  Object.defineProperties(down, { pointerId: { value: 1 }, isPrimary: { value: true } });
  await act(async () => { pin.dispatchEvent(down); vi.advanceTimersByTime(600); });
  expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  expect(onClick).not.toHaveBeenCalled();
  await act(async () => container.querySelector<HTMLButtonElement>('[role="dialog"] button')!.click());
  expect(clear).not.toHaveBeenCalled();
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  await act(async () => root.unmount());
  container.remove();
});

it.each([["web", MapDraftMarker], ["mobile", MobileMapDraftMarker]] as const)("%s draft marker reports wrapped coordinates only after drag end", async (_, Marker) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  const root = createRoot(container);
  const onPick = vi.fn();
  await act(async () => root.render(<Marker location={{ latitude: 10, longitude: 20 }} label="Draft" draggable onPick={onPick} />));
  expect(onPick).not.toHaveBeenCalled();
  await act(async () => container.querySelector<HTMLButtonElement>("[data-drag-end]")!.click());
  expect(onPick).toHaveBeenCalledExactlyOnceWith({ latitude: -12, longitude: 45 });
  await act(async () => root.unmount());
});
