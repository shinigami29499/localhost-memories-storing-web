import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../services/api";
import type { Place, PlaceVisit } from "../types";
import { placeService } from "./placeService";

vi.mock("../../../services/api", () => ({ api: vi.fn() }));

describe("placeService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the location route and replaces saved purple markers", async () => {
    const place: Place = {
      id: "place-1",
      name: "Cafe",
      address: "",
      note: "",
      latitude: 0,
      longitude: 0,
      rating: 0,
      markerIcon: "â˜•",
      markerColor: "#7048e8",
      owner: { id: "user-1", username: "user" },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: null,
      mediaIds: [],
    };
    vi.mocked(api).mockResolvedValue([place]);

    await expect(placeService.list()).resolves.toEqual([
      { ...place, markerColor: "#0EA5E9" },
    ]);
    expect(api).toHaveBeenCalledWith("/api/location");
  });

  it("loads visit history for the signed-in user", async () => {
    const visits: PlaceVisit[] = [{
      id: "visit-1",
      placeId: "place-1",
      placeName: "Cafe",
      placeAddress: "1 Main Street",
      markerIcon: "â˜•",
      markerColor: "#f97316",
      visitedAt: "2026-10-31T02:43:06Z",
    }];
    vi.mocked(api).mockResolvedValue(visits);

    await expect(placeService.visitHistory()).resolves.toEqual(visits);
    expect(api).toHaveBeenCalledWith("/api/location/visits");
  });

  it("creates a visit for the selected place", async () => {
    vi.mocked(api).mockResolvedValue(undefined);

    await placeService.checkIn("place-1");

    expect(api).toHaveBeenCalledWith("/api/location/place-1/visits", { method: "POST" });
  });
});
