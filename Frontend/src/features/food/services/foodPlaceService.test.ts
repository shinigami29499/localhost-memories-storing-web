import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../services/api";
import type { FoodPlace } from "../types";
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
});
