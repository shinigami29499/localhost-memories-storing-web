// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../../../../packages/api/src";

afterEach(() => vi.unstubAllGlobals());

it("cancels response body parsing when the caller aborts after headers", async () => {
  const controller = new AbortController();
  let bodyStarted!: () => void;
  const started = new Promise<void>((resolve) => { bodyStarted = resolve; });
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => ({
    ok: true,
    status: 200,
    json: () => new Promise((_resolve, reject) => {
      bodyStarted();
      options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
    }),
  })));

  const request = api("/api/test", { signal: controller.signal });
  await started;
  controller.abort();
  await expect(request).rejects.toMatchObject({ name: "AbortError" });
});
