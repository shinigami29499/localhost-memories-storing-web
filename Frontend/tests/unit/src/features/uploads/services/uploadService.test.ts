import { expect, it, vi } from "vitest";
import { api, uploadWithProgress } from "../../../../../../src/services/api";
import { uploadService } from "../../../../../../src/features/uploads/services/uploadService";

vi.mock("../../../../../../src/services/api", () => ({ api: vi.fn(), uploadWithProgress: vi.fn() }));

it("sends one direct multipart upload using the media identifier", () => {
  const file = new File(["test"], "photo.jpg");
  const progress = vi.fn();
  const { signal } = new AbortController();
  void uploadService.upload("album", "file-id", file, progress, signal);
  expect(uploadWithProgress).toHaveBeenCalledExactlyOnceWith(
    "/api/library/album/album/media/file/file-id", file, progress, signal, "PUT",
  );
});

it("keeps image lookup for older batches", () => {
  void uploadService.imageIds("batch");
  expect(api).toHaveBeenCalledExactlyOnceWith("/api/sync/upload/batch/batch/image");
});
