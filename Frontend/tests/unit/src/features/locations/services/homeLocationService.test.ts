import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../../../../src/services/api";
import { homeLocationService } from "../../../../../../src/features/locations/services/homeLocationService";

vi.mock("../../../../../../src/services/api", () => ({ api: vi.fn() }));

describe("homeLocationService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not assign existing photos without explicit consent", async () => {
    await homeLocationService.set({ latitude: 0, longitude: 0 });
    expect(api).toHaveBeenCalledWith("/api/place/home-location", {
      method: "PUT",
      body: { latitude: 0, longitude: 0, applyToUnlocatedPhotos: false },
    });
  });

  it("includes explicit consent when assigning existing photos", async () => {
    await homeLocationService.set({ latitude: -90, longitude: 180 }, true);
    expect(api).toHaveBeenCalledWith("/api/place/home-location", {
      method: "PUT",
      body: { latitude: -90, longitude: 180, applyToUnlocatedPhotos: true },
    });
  });
});
