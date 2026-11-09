import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { mediaQueryOptions } from "./useMedia";
import { mediaService } from "../services/mediaService";

vi.mock("../services/mediaService", () => ({
  mediaService: { list: vi.fn(), favorites: vi.fn() },
}));

describe("media pagination cancellation", () => {
  it.each(["all", "favorites"] as const)("aborts abandoned %s requests", async (source) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const service = source === "all" ? mediaService.list : mediaService.favorites;
    let requestSignal: AbortSignal | undefined;
    vi.mocked(service).mockImplementation((_offset, _limit, _kind, signal) => {
      requestSignal = signal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    });
    const options = mediaQueryOptions(20, source);
    const pending = client.fetchInfiniteQuery(options);
    const rejected = expect(pending).rejects.toThrow();
    try {
      await client.cancelQueries({ queryKey: options.queryKey });
      await rejected;
      expect(requestSignal?.aborted).toBe(true);
    } finally {
      client.clear();
    }
  });
});
