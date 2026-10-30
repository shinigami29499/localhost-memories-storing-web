import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../services/api";
import { locationService } from "./locationService";

vi.mock("../../../services/api", () => ({ api: vi.fn() }));

describe("locationService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends a complete coordinate pair including zero", async () => {
    await locationService.set("photo", { latitude: 0, longitude: -120 });
    expect(api).toHaveBeenCalledWith("/api/location/travel/photo", {
      method: "PUT", body: { latitude: 0, longitude: -120 },
    });
  });

  it("sends two explicit nulls when removing a location", async () => {
    await locationService.set("photo", null);
    expect(api).toHaveBeenCalledWith("/api/location/travel/photo", {
      method: "PUT", body: { latitude: null, longitude: null },
    });
  });

  it("forwards the batch offset and cancellation signal", async () => {
    const controller = new AbortController();
    await locationService.scan(2, controller.signal);
    expect(api).toHaveBeenCalledWith("/api/location/travel/scan?offset=2", {
      method: "POST", signal: controller.signal,
    });
  });
});
