// @vitest-environment jsdom
import { act, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDirections, type NavigationRoute } from "../services/directionsService";
import { MapNavigation } from "./MapNavigation";

const map = vi.hoisted(() => ({
  fitBounds: vi.fn(), easeTo: vi.fn(),
  getContainer: () => ({ clientWidth: 1000, clientHeight: 600 }),
}));
vi.mock("react-map-gl/mapbox", () => ({
  useMap: () => ({ current: map }),
  Source: ({ children }: { children: ReactNode }) => <div data-route>{children}</div>,
  Layer: () => null,
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("../../../hooks/useMediaQuery", () => ({ useMediaQuery: () => false }));
vi.mock("../../../components/ui", () => ({
  Button: ({ busy, variant: _variant, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: string }) =>
    <button {...props} disabled={props.disabled || busy} />,
}));
vi.mock("../../../components/animate-ui/icons/x", () => ({ XIcon: () => <svg /> }));
vi.mock("../services/directionsService", async (original) => ({
  ...await original<typeof import("../services/directionsService")>(),
  getDirections: vi.fn(),
}));

const route: NavigationRoute = {
  coordinates: [[0, 0], [0.01, 0]], distance: 1112, duration: 120,
  steps: [{ instruction: "Head east", distance: 1112, duration: 120 }, { instruction: "Arrive", distance: 0, duration: 0 }],
};
const destination = { latitude: 0, longitude: 0.01, name: "Lunch" };
const fix = (latitude = 0, longitude = 0, accuracy = 5): GeolocationPosition => ({
  timestamp: Date.now(),
  coords: {
    latitude, longitude, accuracy, heading: null, speed: null, altitude: null, altitudeAccuracy: null,
    toJSON: () => ({}),
  },
  toJSON: () => ({}),
});

describe("MapNavigation", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let locate: PositionCallback;
  let locationError: PositionErrorCallback;
  let update: PositionCallback;
  let watchError: PositionErrorCallback;
  const clearWatch = vi.fn();
  const onOpenChange = vi.fn();
  const watchPosition = vi.fn();
  const getCurrentPosition = vi.fn();
  const button = (text: string) => [...container.querySelectorAll("button")].find((item) => item.textContent === text)!;
  const click = async (text: string) => { await act(async () => { button(text).click(); }); };
  const render = async (point = destination) => {
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <MapNavigation destination={point} accessToken="pk.test" onOpenChange={onOpenChange} />
      </QueryClientProvider>,
    ));
  };
  const preview = async () => {
    await click("Navigate");
    await click("Preview with Mapbox");
    await act(async () => { locate(fix()); });
  };
  const updatePosition = async (latitude: number, longitude: number, accuracy = 5) => {
    await act(async () => { update(fix(latitude, longitude, accuracy)); });
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-30T12:00:00Z"));
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    getCurrentPosition.mockImplementation((success: PositionCallback, failure: PositionErrorCallback) => {
      locate = success;
      locationError = failure;
    });
    watchPosition.mockImplementation((success: PositionCallback, failure: PositionErrorCallback) => {
      update = success;
      watchError = failure;
      return 42;
    });
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition, watchPosition, clearWatch } });
    vi.mocked(getDirections).mockResolvedValue(route);
    client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await render();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    vi.resetAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("defaults to driving and exposes Google handoff without requesting browser GPS", async () => {
    await click("Navigate");
    expect(container.querySelector("select")?.value).toBe("driving");
    expect(new URL(container.querySelector("a")!.href).searchParams.get("destination")).toBe("0,0.01");
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(watchPosition).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
  });

  it("previews the route before explicit confirmation starts live GPS", async () => {
    await preview();
    expect(getDirections).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 0, longitude: 0 }), destination, "driving", "pk.test", "en", expect.any(AbortSignal),
    );
    expect(container.querySelector("[data-route]")).not.toBeNull();
    expect(container.textContent).toContain("1.1 km");
    expect(container.textContent).toContain("2 min");
    expect(container.textContent).toContain("Head east");
    expect(watchPosition).not.toHaveBeenCalled();
    await click("Start navigation");
    expect(watchPosition).toHaveBeenCalledOnce();
    expect(button("Stop navigation")).toBeDefined();
    await click("Stop navigation");
    expect(clearWatch).toHaveBeenCalledWith(42);
  });

  it("clears the old route on travel mode change and requests the chosen profile", async () => {
    await preview();
    await act(async () => {
      const select = container.querySelector("select")!;
      select.value = "cycling";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.querySelector("[data-route]")).toBeNull();
    expect(new URL(container.querySelector("a")!.href).searchParams.get("travelmode")).toBe("bicycling");
    await click("Preview with Mapbox");
    await act(async () => { locate(fix()); });
    expect(getDirections).toHaveBeenLastCalledWith(expect.anything(), destination, "cycling", "pk.test", "en", expect.any(AbortSignal));
  });

  it("reports denied location permission and leaves Google Maps available", async () => {
    await click("Navigate");
    await click("Preview with Mapbox");
    await act(async () => { locationError({ code: 1 } as GeolocationPositionError); });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Check location permission");
    expect(container.querySelector("a")).not.toBeNull();
    expect(getDirections).not.toHaveBeenCalled();
  });

  it("shows a clear error when geolocation is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    await click("Navigate");
    await click("Preview with Mapbox");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("current location");
    expect(getDirections).not.toHaveBeenCalled();
  });

  it("does not fetch a route for an inaccurate starting fix", async () => {
    await click("Navigate");
    await click("Preview with Mapbox");
    await act(async () => { locate(fix(0, 0, 101)); });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("accuracy");
    expect(getDirections).not.toHaveBeenCalled();
  });

  it("reroutes only past the accuracy-aware threshold and throttles to 15 seconds", async () => {
    await preview();
    await click("Start navigation");
    await updatePosition(-0.0004, 0.005);
    expect(getDirections).toHaveBeenCalledTimes(1);
    await updatePosition(-0.0006, 0.005, 40);
    expect(getDirections).toHaveBeenCalledTimes(1);
    await updatePosition(-0.0006, 0.005);
    expect(getDirections).toHaveBeenCalledTimes(2);
    await updatePosition(-0.001, 0.005);
    expect(getDirections).toHaveBeenCalledTimes(2);
    await act(async () => { vi.advanceTimersByTime(15000); });
    await updatePosition(-0.001, 0.005);
    expect(getDirections).toHaveBeenCalledTimes(3);
  });

  it("pauses progress and camera updates for inaccurate GPS", async () => {
    await preview();
    await click("Start navigation");
    await updatePosition(0, 0.005);
    const summary = container.querySelector(".map-navigation__summary")!.textContent;
    map.easeTo.mockClear();
    await updatePosition(-0.01, 0, 101);
    expect(getDirections).toHaveBeenCalledTimes(1);
    expect(map.easeTo).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Guidance is paused");
    expect(container.querySelector(".map-navigation__summary")!.textContent).toBe(summary);
  });

  it("stops guidance explicitly if rerouting fails", async () => {
    await preview();
    await click("Start navigation");
    vi.mocked(getDirections).mockRejectedValueOnce(new Error("No route found for this travel mode. Choose another mode or destination."));
    await updatePosition(-0.001, 0.005);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("No route found");
    expect(clearWatch).toHaveBeenCalledWith(42);
    expect(button("Start navigation")).toBeUndefined();
  });

  it("keeps guidance paused when GPS degrades during a reroute", async () => {
    await preview();
    await click("Start navigation");
    let resolve!: (value: NavigationRoute) => void;
    vi.mocked(getDirections).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    await updatePosition(-0.001, 0.005);
    await updatePosition(-0.002, 0.005, 101);
    await act(async () => { resolve(route); });
    expect(container.textContent).toContain("Guidance is paused");
    expect(clearWatch).not.toHaveBeenCalled();
  });

  it("releases the watch when GPS reports an error", async () => {
    await preview();
    await click("Start navigation");
    await act(async () => { watchError({ code: 2 } as GeolocationPositionError); });
    expect(clearWatch).toHaveBeenCalledWith(42);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("current location");
  });

  it("arrives only near the destination and releases GPS", async () => {
    await preview();
    await click("Start navigation");
    await updatePosition(0, 0.0099);
    expect(container.textContent).toContain("You have arrived");
    expect(clearWatch).toHaveBeenCalledWith(42);
    expect(button("Stop navigation")).toBeUndefined();
  });

  it("distinguishes a snapped route endpoint from the actual destination", async () => {
    await render({ ...destination, longitude: 0.02 });
    await preview();
    expect(container.textContent).toContain("Route ends 1.1 km from the destination.");
    await click("Start navigation");
    await updatePosition(0, 0.01);
    expect(container.textContent).toContain("Route complete. Destination is 1.1 km away.");
    expect(container.textContent).not.toContain("You have arrived");
    expect(clearWatch).toHaveBeenCalledWith(42);
  });

  it("ignores delayed location callbacks after closing", async () => {
    await click("Navigate");
    await click("Preview with Mapbox");
    await act(async () => { container.querySelector<HTMLButtonElement>('[aria-label="Close navigation"]')!.click(); });
    await act(async () => { locate(fix()); });
    expect(getDirections).not.toHaveBeenCalled();
    expect(button("Navigate")).toBeDefined();
    expect(document.activeElement).toBe(button("Navigate"));
  });

  it("stops GPS when switching to Google Maps", async () => {
    await preview();
    await click("Start navigation");
    await act(async () => {
      const link = container.querySelector("a")!;
      link.addEventListener("click", (event) => event.preventDefault());
      link.click();
    });
    expect(clearWatch).toHaveBeenCalledWith(42);
  });

  it("releases the GPS watch on unmount and ignores delayed fixes", async () => {
    await preview();
    await click("Start navigation");
    await act(async () => { root.render(null); });
    expect(clearWatch).toHaveBeenCalledWith(42);
    await updatePosition(-0.01, 0.005);
    expect(getDirections).toHaveBeenCalledTimes(1);
  });

  it("does not arrive from an inaccurate or stale GPS fix", async () => {
    await preview();
    await click("Start navigation");
    await updatePosition(0, 0.01, 101);
    const old = fix(0, 0.01);
    await act(async () => {
      vi.advanceTimersByTime(31000);
      update(old);
    });
    expect(container.textContent).not.toContain("You have arrived");
    expect(clearWatch).not.toHaveBeenCalled();
    await updatePosition(0, 0.01);
    expect(container.textContent).toContain("You have arrived");
  });

  it("cancels a pending route on destination change and ignores its eventual result", async () => {
    let resolve!: (value: NavigationRoute) => void;
    vi.mocked(getDirections).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    await click("Navigate");
    await click("Preview with Mapbox");
    await act(async () => { locate(fix()); });
    const signal = vi.mocked(getDirections).mock.calls[0][5];
    await render({ ...destination, longitude: 1, name: "Next stop" });
    expect(signal.aborted).toBe(true);
    await act(async () => { resolve(route); });
    expect(container.querySelector("[data-route]")).toBeNull();
    expect(button("Navigate")).toBeDefined();
  });

  it("releases GPS and resets the provider chooser when the destination changes", async () => {
    await preview();
    await click("Start navigation");
    await render({ ...destination, longitude: 1 });
    expect(clearWatch).toHaveBeenCalledWith(42);
    expect(container.querySelector("[data-route]")).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("aborts slow requests and presents a retryable timeout", async () => {
    vi.mocked(getDirections).mockImplementationOnce((_a, _b, _c, _d, _e, signal) =>
      new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))));
    await click("Navigate");
    await click("Preview with Mapbox");
    await act(async () => { locate(fix()); });
    await act(async () => { vi.advanceTimersByTime(15000); });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("timed out");
    expect(button("Preview with Mapbox").disabled).toBe(false);
  });
});
