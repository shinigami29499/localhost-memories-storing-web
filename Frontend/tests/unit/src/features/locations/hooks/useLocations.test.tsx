// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mediaService } from "../../../../../../src/features/media/services/mediaService";
import type { MediaFile } from "../../../../../../src/features/media/types";
import { locationService } from "../../../../../../src/features/locations/services/locationService";
import { useLocations } from "../../../../../../src/features/locations/hooks/useLocations";

vi.mock("../../../../../../src/features/media/services/mediaService", () => ({ mediaService: { get: vi.fn() } }));
vi.mock("../../../../../../src/features/locations/services/locationService", () => ({ locationService: { mapPage: vi.fn(), scan: vi.fn() } }));

const photo = (id: string): MediaFile => ({
  id, ownerId: "owner", originalFilename: `${id}.jpg`, location: { latitude: 0, longitude: 0 },
  mediaKind: "image", createdAt: "2026-01-01T00:00:00Z", isFavorited: false,
});
const bounds = { west: -10, south: -20, east: 10, north: 20 };
let state: ReturnType<typeof useLocations>;

function Harness({ ids = [] }: { ids?: string[] }) {
  state = useLocations(true, ids, bounds);
  void state.query.isFetchNextPageError;
  void state.query.hasNextPage;
  return null;
}

describe("useLocations", () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: QueryClient;
  const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  const render = async (ids: string[] = []) => {
    await act(async () => root.render(<QueryClientProvider client={client}><Harness ids={ids} /></QueryClientProvider>));
    await settle();
  };

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.resetAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it("retains current photos after a page failure and allows retry", async () => {
    vi.mocked(locationService.mapPage).mockImplementation(async (offset) => {
      if (offset === 0) return { offset, total: 2, items: [photo("first")] };
      throw new Error("offline");
    });
    await render();
    expect(state.media.map((item) => item.id)).toEqual(["first"]);
    await act(async () => { await state.query.fetchNextPage(); });
    await settle();
    expect(state.query.isFetchNextPageError).toBe(true);
    expect(state.media.map((item) => item.id)).toEqual(["first"]);
    vi.mocked(locationService.mapPage).mockResolvedValueOnce({ offset: 1, total: 2, items: [photo("second")] });
    await act(async () => { await state.query.fetchNextPage(); });
    await settle();
    expect(state.media.map((item) => item.id)).toEqual(["first", "second"]);
    expect(state.query.hasNextPage).toBe(false);
  });

  it("includes requested photos outside the map page without duplicates", async () => {
    vi.mocked(locationService.mapPage).mockResolvedValue({ offset: 0, total: 1, items: [photo("visible")] });
    vi.mocked(mediaService.get).mockImplementation(async (id) => photo(id));
    await render(["visible", "outside", "outside"]);
    expect(state.media.map((item) => item.id)).toEqual(["visible", "outside"]);
    expect(mediaService.get).toHaveBeenCalledTimes(2);
    expect(locationService.mapPage).toHaveBeenCalledWith(0, bounds, expect.any(AbortSignal));
  });
});
