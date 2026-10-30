import { afterEach, describe, expect, it, vi } from "vitest";
import { getDirections, googleDirectionsUrl, type TravelMode } from "./directionsService";

const origin = { latitude: 10, longitude: 106 };
const destination = { latitude: 11, longitude: 107 };
const payload = () => ({
  code: "Ok",
  routes: [{
    distance: 1000,
    duration: 120,
    geometry: { type: "LineString", coordinates: [[106, 10], [107, 11]] },
    legs: [{
      steps: [
        { distance: 1000, duration: 120, maneuver: { instruction: "Head north" } },
        { distance: 0, duration: 0, maneuver: { instruction: "Arrive" } },
      ],
    }],
  }],
});

afterEach(() => vi.unstubAllGlobals());

describe("directions providers", () => {
  it.each(["driving", "walking", "cycling"] as TravelMode[])("builds Google %s handoff without a fixed origin", (mode) => {
    const url = new URL(googleDirectionsUrl(destination, mode));
    expect(url.origin).toBe("https://www.google.com");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("destination")).toBe("11,107");
    expect(url.searchParams.get("travelmode")).toBe(mode === "cycling" ? "bicycling" : mode);
    expect(url.searchParams.get("dir_action")).toBe("navigate");
    expect(url.searchParams.has("origin")).toBe(false);
  });

  it("uses a supplied home origin for Google Maps handoff", () => {
    const url = new URL(googleDirectionsUrl(destination, "driving", origin));
    expect(url.searchParams.get("origin")).toBe("10,106");
  });

  it.each(["driving", "walking", "cycling"] as TravelMode[])("requests a full %s route in longitude/latitude order", async (mode) => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => payload() });
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal;
    const route = await getDirections(origin, destination, mode, "pk.test", "vi", signal);
    const [request, options] = fetcher.mock.calls[0];
    const url = new URL(request);
    expect(url.pathname).toBe(`/directions/v5/mapbox/${mode}/106,10;107,11`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      access_token: "pk.test", geometries: "geojson", overview: "full", steps: "true", language: "vi",
    });
    expect(options).toEqual({ signal });
    expect(route).toEqual({
      distance: 1000, duration: 120, coordinates: [[106, 10], [107, 11]],
      steps: [{ instruction: "Head north", distance: 1000, duration: 120 }, { instruction: "Arrive", distance: 0, duration: 0 }],
    });
  });

  it("reports no route", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: "NoRoute", routes: [] }) }));
    await expect(getDirections(origin, destination, "driving", "pk.test", "en", new AbortController().signal))
      .rejects.toThrow("No route found");
  });

  it.each([
    { code: "Ok", routes: [] },
    { code: "InvalidInput" },
    { ...payload(), routes: [{ ...payload().routes[0], distance: -1 }] },
    { ...payload(), routes: [{ ...payload().routes[0], geometry: { type: "LineString", coordinates: [[181, 10], [107, 11]] } }] },
    { ...payload(), routes: [{ ...payload().routes[0], legs: [{ steps: [] }] }] },
  ])("rejects malformed or incomplete directions", async (data) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
    await expect(getDirections(origin, destination, "driving", "pk.test", "en", new AbortController().signal))
      .rejects.toThrow("invalid directions");
  });

  it("reports HTTP failure without accepting a route", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(getDirections(origin, destination, "driving", "pk.test", "en", new AbortController().signal))
      .rejects.toThrow("usage limits");
  });

  it("rejects invalid coordinates and secret tokens before sending requests", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(() => googleDirectionsUrl({ latitude: NaN, longitude: 1 }, "driving")).toThrow("Invalid navigation coordinates");
    expect(() => googleDirectionsUrl(destination, "driving", { latitude: 91, longitude: 0 })).toThrow("Invalid navigation coordinates");
    await expect(getDirections(origin, { latitude: 91, longitude: 0 }, "driving", "pk.test", "en", new AbortController().signal))
      .rejects.toThrow("Invalid navigation coordinates");
    await expect(getDirections(origin, destination, "driving", "sk.secret", "en", new AbortController().signal))
      .rejects.toThrow("public access token");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
