// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { PhotoClusterMarker } from "../../../../../../src/features/locations/components/LocationMapShared";
import { MobilePhotoClusterMarker } from "../../../../../../apps/mobile/src/places/MobilePhotoClusterMarker";
import { PlaceClusterMarker } from "../../../../../../src/features/place/components/PlaceMapShared";
import { MobilePlaceClusterMarker } from "../../../../../../apps/mobile/src/places/MobilePlaceClusterMarker";
import type { MediaFile } from "../../../../../../src/features/media/types";
import type { Place } from "../../../../../../src/features/place/types";

vi.mock("react-map-gl/mapbox", () => ({ Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>, useMap: () => ({}) }));
afterEach(() => vi.unstubAllGlobals());

it.each([["web", PhotoClusterMarker], ["mobile", MobilePhotoClusterMarker]] as const)("%s photo cluster pages through its markers", async (_, Cluster) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const items: MediaFile[] = Array.from({ length: 21 }, (_, index) => ({ id: String(index), originalFilename: `Photo ${index}`,
    mediaKind: "image", createdAt: "", isFavorited: false, location: { latitude: 1, longitude: 2 } }));
  const Pin = ({ item }: { item: MediaFile }) => <span>{item.originalFilename}</span>;
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<Cluster cluster={{ id: "0", latitude: 1, longitude: 2, items }} shadowLocation={{ latitude: 1, longitude: 2 }}
    selected={undefined} onSelect={vi.fn()} canMove={() => false} onMove={vi.fn()} homeExpanded nearHome={false} hidePreview hideCount={false} PinComponent={Pin} />));
  expect(container.textContent).toContain("Photo 0");
  expect(container.textContent).not.toContain("Photo 20");
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Show next markers"]')!.click());
  expect(container.textContent).toContain("Photo 20");
  await act(async () => root.unmount());
});

it.each([["web", PlaceClusterMarker], ["mobile", MobilePlaceClusterMarker]] as const)("%s place cluster pages through its markers", async (_, Cluster) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const items: Place[] = Array.from({ length: 21 }, (_, index) => ({ id: String(index), name: `Place ${index}`, address: "", note: "", rating: 0,
    latitude: 1, longitude: 2, markerIcon: "X", markerColor: "red", owner: { id: "u", username: "User" }, mediaIds: [] }));
  const Marker = ({ place }: { place: Place }) => <span>{place.name}</span>;
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<Cluster group={{ location: { latitude: 1, longitude: 2 }, items }} shadowLocation={{ latitude: 1, longitude: 2 }}
    selectedId={null} onSelect={vi.fn()} canChange={() => false} onMove={vi.fn()} onDelete={vi.fn()} homeExpanded nearHome={false} hidePreview hideCount={false} MarkerComponent={Marker} />));
  expect(container.textContent).toContain("Place 0");
  expect(container.textContent).not.toContain("Place 20");
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Show next markers"]')!.click());
  expect(container.textContent).toContain("Place 20");
  await act(async () => root.unmount());
});
