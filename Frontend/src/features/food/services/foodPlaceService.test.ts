import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../services/api";
import type { FoodPlace, FoodPlaceVisit } from "../types";
import { foodPlaceService } from "./foodPlaceService";

vi.mock("../../../services/api", () => ({ api: vi.fn() }));

describe("foodPlaceService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the location route and replaces saved purple markers", async () => {
    const place: FoodPlace = {
      id: "place-1",
      name: "Cafe",
      address: "",
      note: "",
      latitude: 0,
      longitude: 0,
      rating: 0,
      markerIcon: "☕",
      markerColor: "#7048e8",
      owner: { id: "user-1", username: "user" },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: null,
      mediaIds: [],
    };
    vi.mocked(api).mockResolvedValue([place]);

    await expect(foodPlaceService.list()).resolves.toEqual([
      { ...place, markerColor: "#0EA5E9" },
    ]);
    expect(api).toHaveBeenCalledWith("/api/location/food");
  });

  it("loads visit history for the signed-in user", async () => {
    const visits: FoodPlaceVisit[] = [{
      id: "visit-1",
      foodPlaceId: "place-1",
      foodPlaceName: "Cafe",
      foodPlaceAddress: "1 Main Street",
      markerIcon: "☕",
      visitedAt: "2026-10-31T02:43:06Z",
    }];
    vi.mocked(api).mockResolvedValue(visits);

    await expect(foodPlaceService.visitHistory()).resolves.toEqual(visits);
    expect(api).toHaveBeenCalledWith("/api/location/food/visits");
  });

  it("creates a visit for the selected food place", async () => {
    vi.mocked(api).mockResolvedValue(undefined);

    await foodPlaceService.checkIn("place-1");

    expect(api).toHaveBeenCalledWith("/api/location/food/place-1/visits", { method: "POST" });
  });
});
