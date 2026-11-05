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

  it("requests located photos within the current viewport", async () => {
    const controller = new AbortController();
    await locationService.mapPage(100, { west: 170, south: -20, east: -170, north: 30 }, controller.signal);
    expect(api).toHaveBeenCalledWith(
      "/api/location/travel/map?offset=100&limit=100&west=170&south=-20&east=-170&north=30",
      { signal: controller.signal },
    );
  });

  it("requests unlocated photos independently of the map", async () => {
    const controller = new AbortController();
    await locationService.unlocatedPage(50, controller.signal);
    expect(api).toHaveBeenCalledWith("/api/location/travel/unlocated?offset=50&limit=50", { signal: controller.signal });
  });

});
