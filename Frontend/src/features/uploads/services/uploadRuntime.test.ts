// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { showToast } from "../../../components/ui";
import { getUploadFile, removeUploadFile } from "./uploadFileStore";
import { uploadService } from "./uploadService";
import { cancelRunningUpload, requestUploadRetry, startUploadRuntime, wakeUploadRuntime } from "./uploadRuntime";
import type { UploadBatch, UploadItem } from "../types";
import { useUploadNotificationStore } from "../../notifications/uploadNotificationStore";

vi.mock("../../../components/ui", () => ({
  showToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("./uploadFileStore", () => ({
  getUploadFile: vi.fn(),
  removeUploadFile: vi.fn(),
}));
vi.mock("./uploadService", () => ({
  uploadService: {
    recover: vi.fn(), active: vi.fn(), queue: vi.fn(), get: vi.fn(),
    start: vi.fn(), upload: vi.fn(), reportProgress: vi.fn(), fail: vi.fn(), cancel: vi.fn(),
  },
}));

function item(id: string): UploadItem {
  return {
    id, uploadBatchId: "batch", originalFilename: `${id}.png`, contentType: "image/png",
    fileSizeBytes: 10, status: "Pending", progressPercent: 0, errorDetails: null,
    retryCount: 0, startedAt: null, completedAt: null,
  };
}

function batch(items: UploadItem[], complete = false): UploadBatch {
  return {
    id: "batch", postId: complete ? "post" : null, caption: "A feed post",
    status: complete ? "Success" : "Pending", username: null, canManage: true,
    createdAt: "2026-10-28T00:00:00Z", startedAt: null,
    completedAt: complete ? "2026-10-28T00:01:00Z" : null,
    totalFiles: items.length, successfulFiles: complete ? items.length : 0,
    failedFiles: 0, pendingFiles: complete ? 0 : items.length,
    uploadingFiles: 0, cancelledFiles: 0, progressPercent: complete ? 100 : 0, items,
  };
}

describe("feed post upload runtime", () => {
  let stop: (() => void) | undefined;
  const originalLocks = Object.getOwnPropertyDescriptor(navigator, "locks");

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    useUploadNotificationStore.setState({ items: [] });
    window.history.replaceState(null, "", "/");
    vi.mocked(uploadService.active).mockResolvedValue([]);
    vi.mocked(uploadService.queue).mockResolvedValue([]);
    vi.mocked(uploadService.reportProgress).mockResolvedValue(item("progress"));
    vi.mocked(getUploadFile).mockResolvedValue(new File(["media"], "photo.png", { type: "image/png" }));
    Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
  });

  afterEach(async () => {
    stop?.();
    stop = undefined;
    await vi.runOnlyPendingTimersAsync();
    if (originalLocks) Object.defineProperty(navigator, "locks", originalLocks);
    else Reflect.deleteProperty(navigator, "locks");
    vi.useRealTimers();
  });

  function installBrowserLocks() {
    const held = new Set<string>();
    const request = vi.fn(async (name: string, options: LockOptions, callback: LockGrantedCallback<unknown>) => {
      if (options.ifAvailable && options.signal) {
        throw new DOMException(
          "The 'signal' and 'ifAvailable' options cannot be used together.",
          "NotSupportedError",
        );
      }
      if (held.has(name)) return callback(null);
      held.add(name);
      try {
        return await callback({ name, mode: "exclusive" });
      } finally {
        held.delete(name);
      }
    });
    Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });
    return { request, held };
  }

  it("does not fetch active batches or the queue again while idle", async () => {
    stop = startUploadRuntime("idle-user", (key) => key, vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    expect(uploadService.active).toHaveBeenCalledOnce();
    expect(uploadService.queue).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(uploadService.active).toHaveBeenCalledOnce();
    expect(uploadService.queue).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("wakes on upload changes, drains new work, then stays idle again", async () => {
    stop = startUploadRuntime("event-user", (key) => key, vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    const pending = item("new-file");
    vi.mocked(uploadService.queue).mockResolvedValueOnce([pending]);
    vi.mocked(uploadService.upload).mockResolvedValue({ ...pending, status: "Success" });
    vi.mocked(uploadService.get).mockResolvedValue(batch([pending], true));

    wakeUploadRuntime();
    await vi.advanceTimersByTimeAsync(0);
    expect(uploadService.start).toHaveBeenCalledExactlyOnceWith("batch", "new-file");
    expect(uploadService.upload).toHaveBeenCalledOnce();
    const activeCalls = vi.mocked(uploadService.active).mock.calls.length;
    const queueCalls = vi.mocked(uploadService.queue).mock.calls.length;

    await vi.advanceTimersByTimeAsync(60_000);
    expect(uploadService.active).toHaveBeenCalledTimes(activeCalls);
    expect(uploadService.queue).toHaveBeenCalledTimes(queueCalls);
  });

  it("does not lose an event received while a queue request is in flight", async () => {
    let finishQueue: (items: UploadItem[]) => void = () => { throw new Error("Queue request has not started."); };
    vi.mocked(uploadService.queue).mockImplementationOnce(() =>
      new Promise<UploadItem[]>((resolve) => { finishQueue = resolve; }));
    stop = startUploadRuntime("in-flight-user", (key) => key, vi.fn());
    await vi.advanceTimersByTimeAsync(0);

    wakeUploadRuntime();
    finishQueue([]);
    await vi.advanceTimersByTimeAsync(0);
    expect(uploadService.queue).toHaveBeenCalledTimes(2);
    expect(uploadService.active).toHaveBeenCalledTimes(2);
  });

  it("wakes for a local retry even without a SignalR event", async () => {
    stop = startUploadRuntime("idle-retry-user", (key) => key, vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    vi.mocked(uploadService.upload).mockResolvedValue({ ...item("retry-file"), status: "Success" });
    vi.mocked(uploadService.get).mockResolvedValue(batch([], true));

    requestUploadRetry("batch", "retry-file");
    await vi.advanceTimersByTimeAsync(0);
    expect(uploadService.start).toHaveBeenCalledExactlyOnceWith("batch", "retry-file");
    expect(uploadService.upload).toHaveBeenCalledOnce();
  });

  it("starts pending file uploads when the browser supports Web Locks", async () => {
    const { request } = installBrowserLocks();
    const pending = item("locked-file");
    vi.mocked(uploadService.queue).mockResolvedValueOnce([pending]);
    vi.mocked(uploadService.upload).mockResolvedValue({ ...pending, status: "Success", progressPercent: 100 });
    vi.mocked(uploadService.get).mockResolvedValue(batch([pending], true));
    stop = startUploadRuntime("browser-lock-user", (key) => key, vi.fn());
    await vi.advanceTimersByTimeAsync(0);

    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(
      "shinigacim.upload-runtime.browser-lock-user",
      { ifAvailable: true },
      expect.any(Function),
    );
    expect(uploadService.recover).toHaveBeenCalledOnce();
    expect(uploadService.start).toHaveBeenCalledExactlyOnceWith("batch", "locked-file");
    expect(uploadService.upload).toHaveBeenCalledOnce();
  });

  it("keeps one lock owner and lets a waiting runtime take over after cleanup", async () => {
    const { held } = installBrowserLocks();
    stop = startUploadRuntime("shared-lock-user", (key) => key, vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    const stopWaiting = startUploadRuntime("shared-lock-user", (key) => key, vi.fn());
    try {
      await vi.advanceTimersByTimeAsync(0);
      expect(held.size).toBe(1);
      expect(uploadService.recover).toHaveBeenCalledOnce();
      stop();
      stop = undefined;
      await vi.advanceTimersByTimeAsync(3000);
      expect(held.size).toBe(1);
      expect(uploadService.recover).toHaveBeenCalledTimes(2);
    } finally {
      stopWaiting();
    }
    await vi.advanceTimersByTimeAsync(0);
    expect(held.size).toBe(0);
  });

  it("uploads ten post files one at a time, invalidates the feed, and notifies once", async () => {
    const files = Array.from({ length: 10 }, (_, index) => item(`file-${index}`));
    const pending = [...files];
    let active = 0;
    let maximumActive = 0;
    vi.mocked(uploadService.active).mockImplementation(async () => pending.length ? [batch(files)] : []);
    vi.mocked(uploadService.queue).mockImplementation(async () => [...pending]);
    vi.mocked(uploadService.get).mockResolvedValue(batch(files, true));
    vi.mocked(uploadService.upload).mockImplementation(async (_batchId, id, _file, progress) => {
      active++;
      maximumActive = Math.max(maximumActive, active);
      progress(10, 10);
      await Promise.resolve();
      active--;
      pending.splice(pending.findIndex((file) => file.id === id), 1);
      return { ...item(id), status: "Success", progressPercent: 100 };
    });
    const changed = vi.fn();
    stop = startUploadRuntime("ten-files-user", (key) => key, changed);
    await vi.advanceTimersByTimeAsync(0);

    expect(uploadService.upload).toHaveBeenCalledTimes(10);
    expect(maximumActive).toBe(1);
    expect(vi.mocked(uploadService.start).mock.calls.map((call) => call.slice(0, 2)))
      .toEqual(files.map((file) => ["batch", file.id]));
    expect(uploadService.reportProgress).toHaveBeenCalledTimes(10);
    expect(vi.mocked(uploadService.reportProgress).mock.calls.every((call) => call[2] === 99)).toBe(true);
    expect(changed).toHaveBeenCalledTimes(10);
    expect(removeUploadFile).toHaveBeenCalledTimes(10);
    expect(showToast.success).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(4500);
    expect(showToast.success).toHaveBeenCalledOnce();
  });

  it("retries only the selected failed file without uploading successful files again", async () => {
    vi.mocked(uploadService.upload).mockResolvedValue({ ...item("failed-file"), status: "Success" });
    vi.mocked(uploadService.get).mockResolvedValue(batch([], true));
    requestUploadRetry("batch", "failed-file");
    stop = startUploadRuntime("retry-user", (key) => key, vi.fn());
    await vi.advanceTimersByTimeAsync(0);

    expect(uploadService.start).toHaveBeenCalledExactlyOnceWith("batch", "failed-file");
    expect(uploadService.upload).toHaveBeenCalledOnce();
  });

  it.each([
    ["/admin/posts", "/"],
    ["/", "/uploads"],
    ["/", "/posts/another-post"],
  ])("uses the completion route after navigating from %s to %s", async (initialPath, completionPath) => {
    window.history.replaceState(null, "", initialPath);
    const pending = item("route-file");
    const completed = batch([pending], true);
    vi.mocked(uploadService.active).mockResolvedValueOnce([batch([pending])]);
    vi.mocked(uploadService.queue).mockResolvedValueOnce([pending]);
    vi.mocked(uploadService.get).mockResolvedValue(completed);
    vi.mocked(uploadService.upload).mockImplementation(async () => {
      window.history.replaceState(null, "", completionPath);
      return { ...pending, status: "Success" };
    });
    const userId = `route-user-${completionPath}`;
    stop = startUploadRuntime(userId, (key) => key, vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(4500);

    expect(window.location.pathname).toBe(completionPath);
    if (completionPath === "/") {
      expect(showToast.success).toHaveBeenCalledOnce();
      expect(useUploadNotificationStore.getState().items).toHaveLength(0);
    } else {
      expect(showToast.success).not.toHaveBeenCalled();
      expect(useUploadNotificationStore.getState().items).toEqual([
        expect.objectContaining({ userId, postId: "post", readAt: null }),
      ]);
      const persisted = localStorage.getItem("shinigacim-upload-notifications")!;
      useUploadNotificationStore.setState({ items: [] });
      localStorage.setItem("shinigacim-upload-notifications", persisted);
      await useUploadNotificationStore.persist.rehydrate();
      expect(useUploadNotificationStore.getState().items).toEqual([
        expect.objectContaining({ userId, postId: "post", readAt: null }),
      ]);
    }
  });

  it("reports partial failure instead of announcing that the whole post upload succeeded", async () => {
    const failed = { ...item("failed-file"), status: "Failed" as const };
    vi.mocked(uploadService.get).mockResolvedValue({
      ...batch([item("success-file"), failed], true),
      status: "PartialFailure",
      successfulFiles: 1,
      failedFiles: 1,
    });
    vi.mocked(uploadService.upload).mockRejectedValue(new Error("Connection failed"));
    requestUploadRetry("batch", "failed-file");
    stop = startUploadRuntime("partial-failure-user", (key) => key, vi.fn());
    await vi.advanceTimersByTimeAsync(0);

    expect(showToast.success).not.toHaveBeenCalled();
    expect(showToast.error).toHaveBeenCalledExactlyOnceWith(
      "Upload batch finished with issues", "{success} succeeded, {failed} failed, {cancelled} cancelled.",
    );
    expect(uploadService.upload).toHaveBeenCalledOnce();
  });

  it("records missing file failure after starting its retry", async () => {
    vi.mocked(getUploadFile).mockResolvedValue(undefined);
    vi.mocked(uploadService.get).mockResolvedValue(batch([], true));
    requestUploadRetry("batch", "missing-file");
    stop = startUploadRuntime("missing-file-user", (key) => key, vi.fn());
    await vi.advanceTimersByTimeAsync(0);

    expect(uploadService.start).toHaveBeenCalledExactlyOnceWith("batch", "missing-file");
    expect(uploadService.fail).toHaveBeenCalledWith(
      "batch", "missing-file", expect.stringContaining("no longer available"),
    );
    expect(uploadService.upload).not.toHaveBeenCalled();
  });

  it("cancels only the chosen item and removes only its local file", async () => {
    const cancelled = { ...item("selected"), status: "Cancelled" as const };
    vi.mocked(uploadService.cancel).mockResolvedValue(cancelled);
    expect(await cancelRunningUpload("batch", "selected")).toBe(cancelled);
    expect(uploadService.cancel).toHaveBeenCalledExactlyOnceWith("batch", "selected");
    expect(removeUploadFile).toHaveBeenCalledExactlyOnceWith("selected");
  });
});
