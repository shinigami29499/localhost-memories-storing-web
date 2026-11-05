import { describe, expect, it, vi } from "vitest";
import { uploadService } from "../../uploads/services/uploadService";
import { locationService } from "./locationService";
import { locateUploadedBatch } from "./locateUploadedBatch";

vi.mock("../../uploads/services/uploadService", () => ({ uploadService: { imageIds: vi.fn() } }));
vi.mock("./locationService", () => ({ locationService: { set: vi.fn() } }));

describe("locateUploadedBatch", () => {
  it("tags the exact images from a batch and reports partial failures", async () => {
    const ids = Array.from({ length: 12 }, (_, index) => `photo-${index}`);
    vi.mocked(uploadService.imageIds).mockResolvedValue(ids);
    vi.mocked(locationService.set).mockImplementation(async (id) => {
      if (id === "photo-4") throw new Error("Failed to save");
    });
    const tagged = await locateUploadedBatch("batch-id", { latitude: 0, longitude: 2 });
    expect(uploadService.imageIds).toHaveBeenCalledWith("batch-id");
    expect(tagged).toHaveLength(11);
    expect(tagged).not.toContain("photo-4");
    expect(locationService.set).toHaveBeenCalledTimes(12);
  });
});
