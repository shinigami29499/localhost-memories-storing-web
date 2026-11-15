// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { PhotoPin } from "../../../../../../src/features/locations/components/LocationMapShared";
import { MobilePhotoPin } from "../../../../../../apps/mobile/src/places/MobilePhotoPin";

vi.mock("react-map-gl/mapbox", () => ({
  useMap: () => ({ current: { project: () => ({ x: 0, y: 0 }), unproject: () => ({ wrap: () => ({ lat: 3, lng: 4 }) }) } }),
  Marker: () => null,
}));
afterEach(() => vi.unstubAllGlobals());

it.each([["web", PhotoPin], ["mobile", MobilePhotoPin]] as const)("%s photo pin moves after dragging and suppresses its following click", async (_, Pin) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onSelect = vi.fn();
  const onMove = vi.fn();
  const item = { id: "photo", originalFilename: "Photo", mediaKind: "image" as const, createdAt: "", isFavorited: false, location: { latitude: 1, longitude: 2 } };
  await act(async () => root.render(<Pin item={item} selected={false} movable onSelect={onSelect} onMove={onMove} />));
  const pin = container.querySelector("button")!;
  pin.setPointerCapture = vi.fn();
  pin.releasePointerCapture = vi.fn();
  pin.hasPointerCapture = vi.fn(() => true);
  const pointer = (type: string, x: number) => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x });
    Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } });
    pin.dispatchEvent(event);
  };
  await act(async () => { pointer("pointerdown", 0); pointer("pointermove", 20); pointer("pointerup", 20); pin.click(); });
  expect(onMove).toHaveBeenCalledExactlyOnceWith(item, { latitude: 3, longitude: 4 });
  expect(onSelect).not.toHaveBeenCalled();
  await act(async () => pin.click());
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(item);
  await act(async () => root.unmount());
  container.remove();
});
