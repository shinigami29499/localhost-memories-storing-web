// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readUploadHistory, saveUploadRecord } from "../../../../../../src/features/uploads/services/uploadFileStore";
import { cancelUpload, queueAlbumUploads, retryUpload, startUploadRuntime } from "../../../../../../src/features/uploads/services/uploadRuntime";
import { uploadService } from "../../../../../../src/features/uploads/services/uploadService";
import { useUploadProgress } from "../../../../../../src/features/uploads/uploadProgress";

vi.mock("../../../../../../src/features/uploads/services/uploadFileStore", () => ({
  readUploadHistory: vi.fn(), saveUploadRecord: vi.fn(), removeUploadRecord: vi.fn(),
}));
vi.mock("../../../../../../src/features/uploads/services/uploadService", () => ({
  uploadService: { upload: vi.fn() },
}));

let stop: (() => void) | undefined;
const current = () => Object.values(useUploadProgress.getState().transfers);

beforeEach(() => {
  vi.resetAllMocks();
  useUploadProgress.setState({ transfers: {} });
  vi.mocked(readUploadHistory).mockResolvedValue([]);
});

afterEach(() => stop?.());

it("starts files immediately even while browser storage is pending", async () => {
  vi.mocked(readUploadHistory).mockReturnValue(new Promise(() => {}));
  vi.mocked(saveUploadRecord).mockReturnValue(new Promise(() => {}));
  const confirmations: (() => void)[] = [];
  vi.mocked(uploadService.upload).mockImplementation((_album, id, file, progress) => {
    progress(file.size, true);
    return new Promise((resolve) => confirmations.push(() => resolve({ mediaId: id })));
  });
  const onStored = vi.fn();
  stop = startUploadRuntime("user", onStored);
  queueAlbumUploads("album", ["a", "b", "c", "d"].map((name) => new File(["123"], name)), "user");
  expect(current().map(({ status }) => status)).toEqual(["processing", "processing", "processing", "queued"]);
  expect(onStored).not.toHaveBeenCalled();
  confirmations[0]();
  await vi.waitFor(() => expect(uploadService.upload).toHaveBeenCalledTimes(4));
  expect(current()[0]).toMatchObject({ status: "success", loaded: 3, file: undefined });
  expect(onStored).toHaveBeenCalledTimes(1);
  confirmations.slice(1).forEach((confirm) => confirm());
  await vi.waitFor(() => expect(onStored).toHaveBeenCalledTimes(4));
});

it("cancels and retries failure with the original media identifier", async () => {
  const calls: string[] = [];
  vi.mocked(uploadService.upload).mockImplementation((_album, id, _file, progress, signal) => {
    calls.push(id);
    progress(2, false);
    if (calls.length === 2) return Promise.reject(new Error("Connection failed"));
    if (calls.length === 3) return Promise.resolve({ mediaId: id });
    return new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
  });
  stop = startUploadRuntime("user", vi.fn());
  queueAlbumUploads("album", [new File(["123"], "photo.png")], "user");
  const [{ id }] = current();
  cancelUpload(id);
  expect(current()[0]).toMatchObject({ status: "cancelled", loaded: 2 });
  retryUpload(id);
  await vi.waitFor(() => expect(current()[0]).toMatchObject({ status: "failed", loaded: 2, error: "Connection failed" }));
  retryUpload(id);
  await vi.waitFor(() => expect(current()[0].status).toBe("success"));
  expect(calls).toEqual([id, id, id]);
});

it("restores interrupted uploads for manual retry from browser history", async () => {
  vi.mocked(readUploadHistory).mockResolvedValue([{
    id: "restored", userId: "user", albumId: "album", name: "photo.png", file: new File(["a"], "photo.png"),
    status: "processing", loaded: 1, total: 1, createdAt: "2026-10-28T00:00:00Z",
  }]);
  stop = startUploadRuntime("user", vi.fn());
  await vi.waitFor(() => expect(current()[0]).toMatchObject({ id: "restored", status: "failed", loaded: 1 }));
  expect(uploadService.upload).not.toHaveBeenCalled();
});
