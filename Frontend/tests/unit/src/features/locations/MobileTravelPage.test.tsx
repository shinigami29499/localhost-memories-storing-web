// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { MobileTravelPage } from "../../../../../apps/mobile/src/places/MobileTravelPage";

const controls = vi.hoisted(() => ({ fetchNextPage: vi.fn(), refetch: vi.fn() }));
vi.mock("../../../../../src/pages/locations/useTravelPageController", () => ({
  useTravelPageController: () => ({
    t: (key: string, values?: Record<string, number>) => key.replace("{count}", String(values?.count)).replace("{total}", String(values?.total)),
    home: { query: {}, save: {} },
    unlocated: {},
    query: { data: { pages: [{ items: [], total: 1 }] }, hasNextPage: true, ...controls },
    media: [],
  }),
}));
vi.mock("../../../../../apps/mobile/src/places/MobileLocationMap", () => ({ MobileLocationMap: () => <div data-testid="travel-map" /> }));

afterEach(() => vi.unstubAllGlobals());

it("renders the mobile travel map and loads the next page", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  controls.fetchNextPage.mockReset();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<MobileTravelPage />));
  expect(container.querySelector('[data-testid="travel-map"]')).not.toBeNull();
  const more = [...container.querySelectorAll("button")].find((button) => button.textContent === "Load more photos");
  expect(more).toBeDefined();
  await act(async () => more!.click());
  expect(controls.fetchNextPage).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
  container.remove();
});
