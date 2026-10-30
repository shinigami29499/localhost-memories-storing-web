// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "../../../services/api";
import { useAuthStore } from "../../../store/authStore";
import type { MediaFile } from "../../media/types";
import { cancelDownload, clearDownloads, enqueueDownloads, retryDownload, useDownloadStore } from "./downloadQueue";

vi.mock("../../../services/api", () => ({ downloadBlob: vi.fn() }));

const image: MediaFile = {
  id: "image", originalFilename: "original photo.png", mediaKind: "image", mimeType: "image/png",
  fileSizeBytes: 4, createdAt: "", isFavorited: false,
};
const video: MediaFile = { ...image, id: "video", originalFilename: "video.mp4", mediaKind: "video", mimeType: "video/mp4" };
const blob = new Blob(["data"], { type: "image/png" });
const items = () => useDownloadStore.getState().batches.flatMap((batch) => batch.items);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("download queue", () => {
  const saves: string[] = [];

  beforeEach(() => {
    saves.length = 0;
    vi.stubGlobal("URL", class extends URL {
      static createObjectURL = vi.fn(() => `blob:${crypto.randomUUID()}`);
      static revokeObjectURL = vi.fn();
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      saves.push(this.download);
    });
    useAuthStore.setState({
      accessToken: "test-token",
      user: { id: "viewer", username: "viewer", role: "user", status: "active", createdAt: "" },
    });
    vi.mocked(downloadBlob).mockReset();
    vi.mocked(downloadBlob).mockResolvedValue(blob);
  });

  afterEach(async () => {
    clearDownloads();
    useAuthStore.getState().clear();
    await Promise.resolve();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("downloads originals sequentially, preserves filenames, and deduplicates selection", async () => {
    const first = deferred<Blob>();
    vi.mocked(downloadBlob).mockReturnValueOnce(first.promise);
    enqueueDownloads([image, image, video]);
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(items().map((item) => item.status)).toEqual(["Downloading", "Pending"]);
    expect(downloadBlob).toHaveBeenNthCalledWith(
      1, "/api/library/gallery/image/file", expect.any(AbortSignal), expect.any(Function),
    );
    vi.mocked(downloadBlob).mock.calls[0][2](2, 4);
    expect(items()[0].loaded).toBe(2);
    first.resolve(blob);
    await vi.waitFor(() => expect(items().every((item) => item.status === "Sent to browser")).toBe(true));
    expect(downloadBlob).toHaveBeenNthCalledWith(
      2, "/api/library/gallery/video/file", expect.any(AbortSignal), expect.any(Function),
    );
    expect(saves).toEqual(["original photo.png", "video.mp4"]);
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it("reports failed files, continues the batch, and retries only the requested file", async () => {
    vi.mocked(downloadBlob).mockRejectedValueOnce(new Error("File not found"));
    enqueueDownloads([image, video]);
    await vi.waitFor(() => expect(items()[1].status).toBe("Sent to browser"));
    expect(items()[0]).toMatchObject({ status: "Failed", error: "File not found" });
    retryDownload(items()[0].id);
    await vi.waitFor(() => expect(items()[0].status).toBe("Sent to browser"));
    expect(downloadBlob).toHaveBeenCalledTimes(3);
    expect(items()[0].error).toBeUndefined();
    expect(saves).toEqual(["video.mp4", "original photo.png"]);
  });

  it("finishes older batches before starting newly queued batches", async () => {
    const first = deferred<Blob>();
    vi.mocked(downloadBlob).mockReturnValueOnce(first.promise);
    enqueueDownloads([image, video]);
    enqueueDownloads([{ ...image, id: "third", originalFilename: "third.png" }]);
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    first.resolve(blob);
    await vi.waitFor(() => expect(saves).toHaveLength(3));
    expect(saves).toEqual(["original photo.png", "video.mp4", "third.png"]);
  });

  it("cancels both pending and active files without handing aborted data to the browser", async () => {
    const first = deferred<Blob>();
    vi.mocked(downloadBlob).mockReturnValueOnce(first.promise);
    enqueueDownloads([image, video]);
    const signal = vi.mocked(downloadBlob).mock.calls[0][1];
    cancelDownload(items()[1].id);
    cancelDownload(items()[0].id);
    expect(signal.aborted).toBe(true);
    first.resolve(blob);
    await Promise.resolve();
    await Promise.resolve();
    expect(items().map((item) => item.status)).toEqual(["Cancelled", "Cancelled"]);
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(saves).toEqual([]);
  });

  it("clears history and prevents stale saves while allowing a new queue", async () => {
    const first = deferred<Blob>();
    vi.mocked(downloadBlob).mockReturnValueOnce(first.promise);
    enqueueDownloads([image, video]);
    const signal = vi.mocked(downloadBlob).mock.calls[0][1];
    clearDownloads();
    expect(signal.aborted).toBe(true);
    expect(items()).toEqual([]);
    enqueueDownloads([video]);
    first.resolve(blob);
    await vi.waitFor(() => expect(items()[0].status).toBe("Sent to browser"));
    expect(saves).toEqual(["video.mp4"]);
  });

  it("preserves the administrator trash flag without requesting previews", async () => {
    enqueueDownloads([image], true);
    await vi.waitFor(() => expect(items()[0].status).toBe("Sent to browser"));
    expect(downloadBlob).toHaveBeenCalledWith(
      "/api/library/gallery/image/file?includeDeleted=true", expect.any(AbortSignal), expect.any(Function),
    );
    const url = vi.mocked(URL.createObjectURL).mock.results[0].value;
    clearDownloads();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });

  it("requires a signed-in session and a nonempty selection", () => {
    expect(() => enqueueDownloads([])).toThrow("Select media to download.");
    useAuthStore.getState().clear();
    expect(() => enqueueDownloads([image])).toThrow("Sign in to download media.");
    expect(items()).toEqual([]);
  });
});
