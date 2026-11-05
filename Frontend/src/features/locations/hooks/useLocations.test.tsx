// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mediaService } from "../../media/services/mediaService";
import { locationService } from "../services/locationService";
import type { MediaFile } from "../../media/types";
import { useLocations } from "./useLocations";

vi.mock("../../media/services/mediaService", () => ({ mediaService: { list: vi.fn(), get: vi.fn() } }));
vi.mock("../services/locationService", () => ({ locationService: { mapPage: vi.fn() } }));

const photos = Array.from({ length: 101 }, (_, index) => ({ id: `photo-${index}` } as MediaFile));

function Harness() {
  const { media, query } = useLocations(true, ["photo-100"]);
  return <>
    <output>{media.map((item) => item.id).join(",")}</output>
    <button onClick={() => void query.fetchNextPage()}>Load more</button>
  </>;
}

describe("location photo loading", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads one page and resolves a deep link directly until more is requested", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.mocked(mediaService.list).mockImplementation(async (offset = 0, limit = 100) => ({
      items: photos.slice(offset, offset + limit), offset, limit, total: photos.length,
    }));
    vi.mocked(locationService.mapPage).mockImplementation(async (offset) => ({
      items: photos.slice(offset, offset + 100), offset, limit: 100, total: photos.length,
    }));
    vi.mocked(mediaService.get).mockResolvedValue(photos[100]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
      expect(mediaService.list).not.toHaveBeenCalled();
      expect(locationService.mapPage).toHaveBeenCalledTimes(1);
      expect(mediaService.get).toHaveBeenCalledWith("photo-100");
      expect(container.querySelector("output")?.textContent).toContain("photo-100");
      await act(async () => {
        container.querySelector("button")!.click();
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
      expect(locationService.mapPage).toHaveBeenCalledWith(100,
        { west: -180, south: -90, east: 180, north: 90 }, expect.any(AbortSignal));
      expect(mediaService.list).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
      client.clear();
      container.remove();
      vi.clearAllMocks();
    }
  });
});
