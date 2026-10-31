import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchLocations } from "./locationSearchService";

const feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [105.854041, 21.0283334] },
  properties: { name: "Hà Nội", city: "Hà Nội", country: "Việt Nam" },
};

describe("searchLocations", () => {
  const fetch = vi.fn();
  const respond = (features: unknown[]) => fetch.mockResolvedValue({
    ok: true, json: async () => ({ type: "FeatureCollection", features }),
  });

  beforeEach(() => {
    vi.stubGlobal("fetch", fetch);
    respond([feature]);
  });
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it("searches Photon without an API key or application credentials and preserves coordinate order", async () => {
    expect(await searchLocations("  Hanoi & cafes  ")).toEqual([{
      id: "photon:0:105.854041,21.0283334",
      latitude: 21.0283334,
      longitude: 105.854041,
      placeName: "Hà Nội, Việt Nam",
    }]);
    const [url, options] = fetch.mock.calls[0];
    expect(url.origin).toBe("https://photon.komoot.io");
    expect(url.pathname).toBe("/api/");
    expect([...url.searchParams]).toEqual([["q", "Hanoi & cafes"], ["limit", "5"]]);
    expect(options.credentials).toBe("omit");
    expect(options.headers).toBeUndefined();
  });

  it("includes street and house number to distinguish places with the same name", async () => {
    respond([{ ...feature, properties: { name: "Cafe", housenumber: "12", street: "Main Street", city: "Hanoi" } }]);
    expect(await searchLocations("Cafe")).toEqual([expect.objectContaining({
      placeName: "Cafe, 12 Main Street, Hanoi",
    })]);
  });

  it("accepts empty results and limits result count to five", async () => {
    respond([]);
    expect(await searchLocations("Nowhere")).toEqual([]);
    respond(Array.from({ length: 8 }, () => feature));
    expect(await searchLocations("Hanoi")).toHaveLength(5);
  });

  it.each(["", " ", "ab"])("rejects short query %s without an HTTP request", async (query) => {
    await expect(searchLocations(query)).rejects.toThrow("Enter at least 3 characters");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { ...feature, geometry: { type: "LineString", coordinates: [105, 21] } },
    { ...feature, geometry: { type: "Point", coordinates: [181, 21] } },
    { ...feature, geometry: { type: "Point", coordinates: [105, -91] } },
    { ...feature, geometry: { type: "Point", coordinates: ["105", 21] } },
    { ...feature, geometry: { type: "Point", coordinates: [105, NaN] } },
    { ...feature, properties: {} },
  ])("rejects malformed provider features instead of selecting an invalid point", async (invalid) => {
    respond([invalid]);
    await expect(searchLocations("Hanoi")).rejects.toThrow("invalid response");
  });

  it("rejects malformed response collections", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ features: {} }) });
    await expect(searchLocations("Hanoi")).rejects.toThrow("invalid response");
  });

  it("surfaces HTTP and network failures instead of returning empty results", async () => {
    fetch.mockResolvedValue({ ok: false, status: 429 });
    await expect(searchLocations("Hanoi")).rejects.toThrow("Could not search locations");
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(searchLocations("Hanoi")).rejects.toThrow("Failed to fetch");
  });

  it("forwards cancellation to the HTTP request", async () => {
    const controller = new AbortController();
    await searchLocations("Hanoi", controller.signal);
    const signal: AbortSignal = fetch.mock.calls[0][1].signal;
    controller.abort();
    expect(signal.aborted).toBe(true);
  });
});
