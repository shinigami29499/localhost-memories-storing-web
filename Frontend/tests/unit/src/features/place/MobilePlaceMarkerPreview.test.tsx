// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import type { Place } from "../../../../../src/features/place/types";
import { MobilePlaceMarkerPreview } from "../../../../../apps/mobile/src/places/MobilePlaceMarkerPreview";

vi.mock("../../../../../src/utils/media", () => ({ mediaPreviewUrl: (id: string) => `/preview/${id}` }));
vi.mock("../../../../../src/features/place/components/StarRating", () => ({ StarRating: () => <span>Rating</span> }));
afterEach(() => vi.unstubAllGlobals());

it("renders a marker placeholder and a photo count when previews arrive", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const place: Place = { id: "one", name: "Place", address: "Address", note: "", rating: 3,
    latitude: 0, longitude: 0, markerIcon: "X", markerColor: "red", owner: { id: "u", username: "Owner" }, mediaIds: [] };
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<MobilePlaceMarkerPreview place={place} mediaIds={[]} />));
  expect(container.querySelector(".place__popup-placeholder")?.textContent).toBe("X");
  await act(async () => root.render(<MobilePlaceMarkerPreview place={place} mediaIds={["first", "second"]} />));
  expect(container.querySelector("img")?.getAttribute("src")).toBe("/preview/first");
  expect(container.querySelector(".place__popup-count")?.textContent).toBe("+1");
  await act(async () => root.unmount());
});
