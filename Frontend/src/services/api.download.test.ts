import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, downloadBlob } from "./api";
import { useAuthStore } from "../store/authStore";
import type { AuthSession } from "../features/auth/types";

const session: AuthSession = {
  accessToken: "new-token", refreshToken: "new-refresh",
  accessTokenExpiresAtUtc: "2099-01-01T00:00:00Z",
  user: { id: "viewer", username: "viewer", role: "user", status: "active", createdAt: "" },
};

describe("authenticated binary downloads", () => {
  beforeEach(() => {
    useAuthStore.setState({ ...session, accessToken: "old-token", refreshToken: "old-refresh" });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    useAuthStore.getState().clear();
    vi.unstubAllGlobals();
  });

  it("reads exact original bytes and reports streaming progress", async () => {
    const bytes = new Uint8Array([0, 1, 128, 255]);
    vi.mocked(fetch).mockResolvedValue(new Response(bytes, {
      headers: { "Content-Type": "image/png", "Content-Length": "4" },
    }));
    const progress = vi.fn();
    const blob = await downloadBlob("/api/library/gallery/image/file", new AbortController().signal, progress);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
    expect(blob.type).toBe("image/png");
    expect(progress).toHaveBeenLastCalledWith(4, 4);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/image/file"), expect.objectContaining({
      headers: { Authorization: "Bearer old-token" }, cache: "no-store",
    }));
  });

  it("refreshes an expired token once before downloading", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(Response.json(session))
      .mockResolvedValueOnce(new Response("original"));
    const blob = await downloadBlob("/file", new AbortController().signal, vi.fn());
    expect(await blob.text()).toBe("original");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining("/file"), expect.objectContaining({
      headers: { Authorization: "Bearer new-token" },
    }));
  });

  it("shares refresh with concurrent JSON requests and preserves JSON behavior", async () => {
    vi.mocked(fetch).mockImplementation(async (input, options) => {
      if (String(input).endsWith("/api/auth/refresh")) return Response.json(session);
      if ((options?.headers as Record<string, string>)?.Authorization === "Bearer old-token") {
        return new Response("", { status: 401 });
      }
      return String(input).endsWith("/file") ? new Response("original") : Response.json({ total: 3 });
    });
    const [blob, json] = await Promise.all([
      downloadBlob("/file", new AbortController().signal, vi.fn()),
      api<{ total: number }>("/list"),
    ]);
    expect(await blob.text()).toBe("original");
    expect(json).toEqual({ total: 3 });
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith("/api/auth/refresh"))).toHaveLength(1);
  });

  it("surfaces API errors instead of saving error JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ title: "Not found", detail: "Original is missing." }, { status: 404 }));
    await expect(downloadBlob("/file", new AbortController().signal, vi.fn())).rejects.toMatchObject({
      status: 404, message: "Original is missing.",
    });
  });

  it("clears an invalid session after the retried request is unauthorized", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(Response.json(session))
      .mockResolvedValueOnce(new Response("", { status: 401 }));
    await expect(downloadBlob("/file", new AbortController().signal, vi.fn())).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("does not return partially received content after cancellation", async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockResolvedValue(new Response("original"));
    await expect(downloadBlob("/file", controller.signal, () => controller.abort())).rejects.toMatchObject({ name: "AbortError" });
  });
});
