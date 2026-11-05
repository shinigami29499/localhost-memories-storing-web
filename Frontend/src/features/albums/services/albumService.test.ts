import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../services/api";
import { albumService } from "./albumService";

vi.mock("../../../services/api", () => ({ api: vi.fn() }));

describe("album membership batching", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends at most 100 media ids per request and combines the responses", async () => {
    const ids = Array.from({ length: 205 }, (_, index) => `media-${index}`);
    vi.mocked(api).mockImplementation(async (_path, options) => ({
      items: (options?.body as { mediaIds: string[] }).mediaIds.map((mediaId) => ({ mediaId, albumIds: [] })),
    }));

    const result = await albumService.membership(ids);

    expect(api).toHaveBeenCalledTimes(3);
    expect(vi.mocked(api).mock.calls.map(([, options]) => (options?.body as { mediaIds: string[] }).mediaIds.length)).toEqual([100, 100, 5]);
    expect(result.items.map((item) => item.mediaId)).toEqual(ids);
    expect(vi.mocked(api).mock.calls.every(([path, options]) => path === "/api/library/album/membership/query" && options?.method === "POST")).toBe(true);
  });

  it("sends an opaque cursor only on later album pages", async () => {
    vi.mocked(api).mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    await albumService.page("feed", null, 30);
    await albumService.page("feed", "next-page", 30);
    expect(api).toHaveBeenNthCalledWith(1, "/api/library/album/page?scope=feed&limit=30");
    expect(api).toHaveBeenNthCalledWith(2, "/api/library/album/page?scope=feed&limit=30&cursor=next-page");
  });

  it("sends album search and cancellation with the paged request", async () => {
    vi.mocked(api).mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    const controller = new AbortController();
    await albumService.page("mine", null, 30, undefined, " family & friends ", controller.signal);
    expect(api).toHaveBeenCalledWith("/api/library/album/page?scope=mine&limit=30&search=family+%26+friends",
      { signal: controller.signal });
  });
});
