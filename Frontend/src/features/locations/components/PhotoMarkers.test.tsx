// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../../context/LocaleContext";
import type { MediaFile } from "../../media/types";
import { PhotoMarkers } from "./LocationMap";

const map = vi.hoisted(() => ({
  project: ([longitude, latitude]: number[]) => ({ x: longitude, y: latitude }),
  getContainer: () => ({ clientWidth: 100, clientHeight: 100 }),
  on: vi.fn(), off: vi.fn(),
}));
vi.mock("react-map-gl/mapbox", () => ({
  default: () => null,
  GeolocateControl: () => null,
  Marker: ({ children }: { children: ReactNode }) => <div className="mapboxgl-marker">{children}</div>,
  useMap: () => ({ current: map }),
}));

afterEach(() => vi.unstubAllGlobals());

it("loads a preview only for an active visible photo and caps each marker group", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const media: MediaFile[] = Array.from({ length: 25 }, (_, id) => ({
    id: String(id), mediaKind: "image", mimeType: "image/jpeg", originalFilename: `Photo ${id}`,
    fileSizeBytes: 1, createdAt: "", isFavorited: false, location: { latitude: 50, longitude: 50 },
  }));
  media.push({ ...media[0], id: "outside", location: { latitude: 200, longitude: 200 } });
  await act(async () => root.render(<LocaleProvider><PhotoMarkers media={media} selected={undefined} ready
    onSelect={() => {}} canMove={() => false} onMove={() => {}} homeLocation={null} homeHovered={false}
    onHomeHoverChange={() => {}} hidePreview={false} /></LocaleProvider>));
  expect(container.querySelectorAll(".locations__marker")).toHaveLength(20);
  expect(container.querySelectorAll(".locations__popup img")).toHaveLength(0);
  const marker = container.querySelector<HTMLElement>(".locations__marker")!;
  await act(async () => marker.dispatchEvent(new MouseEvent("pointerover", { bubbles: true })));
  expect(container.querySelectorAll(".locations__popup img")).toHaveLength(1);
  await act(async () => marker.dispatchEvent(new MouseEvent("pointerout", { bubbles: true })));
  expect(container.querySelectorAll(".locations__popup img")).toHaveLength(0);
  await act(async () => container.querySelector<HTMLButtonElement>(".locations__cluster-toggle")!.click());
  const next = container.querySelector<HTMLButtonElement>('[aria-label="Show next markers"]')!;
  await act(async () => next.click());
  expect(container.querySelectorAll(".locations__marker")).toHaveLength(5);
  expect(container.querySelector('[aria-label="Photo 24"]')).not.toBeNull();
  await act(async () => root.unmount());
  container.remove();
});
