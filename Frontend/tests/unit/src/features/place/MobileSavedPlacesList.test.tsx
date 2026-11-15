// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import type { Place } from "@/features/place/types";
import { MobileSavedPlacesList } from "../../../../../apps/mobile/src/places/MobileSavedPlacesList";

const place = (id: string): Place => ({
  id, name: id, address: "Address", note: "", rating: 3, latitude: 0, longitude: 0,
  markerIcon: "X", markerColor: "#000000", owner: { id: "owner", username: "Owner" }, mediaIds: [],
});

afterEach(() => vi.unstubAllGlobals());

it("selects a saved place and prevents switching while another place is edited", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onSelect = vi.fn();
  const places = [place("One"), place("Two")];
  await act(async () => root.render(<MobileSavedPlacesList places={places} selectedId="One" editing editingId="One" onSelect={onSelect} />));
  const [first, second] = container.querySelectorAll("button");
  expect(first.getAttribute("aria-pressed")).toBe("true");
  expect(second.disabled).toBe(true);
  await act(async () => { second.click(); first.click(); });
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(places[0]);
  await act(async () => root.unmount());
  container.remove();
});
