// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../services/api";
import { saveUploadFile, removeUploadFile } from "../../uploads/services/uploadFileStore";
import { postService } from "./postService";
import { wakeUploadRuntime } from "../../uploads/services/uploadRuntime";

vi.mock("../../../services/api", () => ({ api: vi.fn() }));
vi.mock("../../uploads/services/uploadRuntime", () => ({ wakeUploadRuntime: vi.fn() }));
vi.mock("../../uploads/services/uploadFileStore", () => ({
  saveUploadFile: vi.fn(),
  removeUploadFile: vi.fn(),
}));

describe("tracked feed post submission", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("registers ten files and their caption in one post submission after storing all file bytes", async () => {
    const files = Array.from({ length: 10 }, (_, index) =>
      new File(["media"], `file-${index}.${index % 2 ? "mp4" : "png"}`, {
        type: index % 2 ? "video/mp4" : "image/png",
      }));
    vi.mocked(api).mockResolvedValue({ id: "batch" });

    await postService.submitTracked("A shared moment", files);

    const metadata = files.map((file, index) => ({
      id: vi.mocked(saveUploadFile).mock.calls[index][0],
      originalFilename: file.name,
      contentType: file.type,
      fileSizeBytes: file.size,
    }));
    expect(new Set(metadata.map((item) => item.id)).size).toBe(10);
    expect(saveUploadFile).toHaveBeenCalledTimes(10);
    for (let index = 0; index < files.length; index++) {
      expect(saveUploadFile).toHaveBeenNthCalledWith(index + 1, metadata[index].id, files[index]);
    }
    expect(api).toHaveBeenCalledExactlyOnceWith("/api/posts/uploads", {
      method: "POST",
      body: { caption: "A shared moment", items: metadata },
    });
    expect(vi.mocked(api).mock.invocationCallOrder[0])
      .toBeGreaterThan(vi.mocked(saveUploadFile).mock.invocationCallOrder[9]);
    expect(removeUploadFile).not.toHaveBeenCalled();
    expect(wakeUploadRuntime).toHaveBeenCalledOnce();
    expect(vi.mocked(wakeUploadRuntime).mock.invocationCallOrder[0])
      .toBeGreaterThan(vi.mocked(api).mock.invocationCallOrder[0]);
  });

  it("does not submit a post when local file persistence fails", async () => {
    const error = new Error("Storage quota exceeded");
    vi.mocked(saveUploadFile).mockRejectedValue(error);

    await expect(postService.submitTracked(undefined, [
      new File(["media"], "photo.png", { type: "image/png" }),
    ])).rejects.toBe(error);

    expect(api).not.toHaveBeenCalled();
    expect(wakeUploadRuntime).not.toHaveBeenCalled();
    expect(removeUploadFile).toHaveBeenCalledOnce();
  });

  it("cleans up staged file bytes when post registration fails", async () => {
    vi.mocked(api).mockRejectedValue(new Error("Post submission rejected"));

    await expect(postService.submitTracked("Caption", [
      new File(["media"], "photo.png", { type: "image/png" }),
    ])).rejects.toThrow("Post submission rejected");

    expect(removeUploadFile).toHaveBeenCalledExactlyOnceWith(vi.mocked(saveUploadFile).mock.calls[0][0]);
    expect(wakeUploadRuntime).not.toHaveBeenCalled();
  });
});
