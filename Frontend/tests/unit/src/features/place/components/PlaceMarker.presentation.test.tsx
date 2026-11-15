// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { PlaceMarker } from "../../../../../../src/features/place/components/PlaceMapShared";
import { MobilePlaceMarker } from "../../../../../../apps/mobile/src/places/MobilePlaceMarker";
import type { Place } from "../../../../../../src/features/place/types";

vi.mock("react-map-gl/mapbox", () => ({ useMap: () => ({ current: { project: () => ({ x: 0, y: 0 }),
  unproject: () => ({ wrap: () => ({ lat: 3, lng: 4 }) }) } }), Marker: () => null }));
vi.mock("../../../../../../src/features/place/hooks/usePlaces", () => ({ usePlace: () => ({ data: undefined }) }));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it.each([["web", PlaceMarker], ["mobile", MobilePlaceMarker]] as const)("%s place marker handles a long press without selecting", async (_, Marker) => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const place: Place = { id: "place", name: "Cafe", address: "", note: "", rating: 0, latitude: 1, longitude: 2,
    markerIcon: "X", markerColor: "red", owner: { id: "owner", username: "Owner" }, mediaIds: [] };
  const onDelete = vi.fn();
  const onSelect = vi.fn();
  await act(async () => root.render(<Marker place={place} selected={false} canChange={() => true} onMove={vi.fn()} onDelete={onDelete} onSelect={onSelect} hidePreview />));
  const pin = container.querySelector<HTMLButtonElement>('[aria-label="Cafe"]')!;
  pin.setPointerCapture = vi.fn();
  pin.releasePointerCapture = vi.fn();
  pin.hasPointerCapture = vi.fn(() => true);
  const down = new MouseEvent("pointerdown", { bubbles: true, button: 0 });
  Object.defineProperties(down, { pointerId: { value: 1 }, isPrimary: { value: true } });
  await act(async () => { pin.dispatchEvent(down); vi.advanceTimersByTime(600); pin.click(); });
  expect(onDelete).toHaveBeenCalledExactlyOnceWith(place);
  expect(onSelect).not.toHaveBeenCalled();
  await act(async () => root.unmount());
  container.remove();
});
