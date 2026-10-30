// @vitest-environment jsdom
import { act, useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../store/authStore";
import { mediaService } from "../../features/media/services/mediaService";
import { locationService } from "../../features/locations/services/locationService";
import type { MediaFile } from "../../features/media/types";
import { LocationsPage } from "./LocationsPage";

const maps = vi.hoisted(() => ({
  status: "LOADED",
  wrapClick: vi.fn(() => ({ lat: 0, lng: -120 })),
  wrapDrag: vi.fn(() => ({ lat: -12, lng: 45 })),
  container: undefined as HTMLElement | undefined,
  viewport: {
    fitBounds: vi.fn(),
    jumpTo: vi.fn(),
    getZoom: vi.fn(() => 2),
    easeTo: vi.fn(),
    resize: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    project: vi.fn(([lng, lat]: [number, number]) => ({ x: lng * 100, y: lat * 100 })),
    getContainer: vi.fn(() => maps.container ?? document.body),
  },
}));
vi.mock("react-map-gl/mapbox", () => ({
  useMap: () => ({ current: maps.viewport }),
  default: function MockMap({ children, onClick, onLoad, onError, mapStyle }: {
    children: ReactNode;
    onClick: (event: { lngLat: { lat: number; lng: number; wrap: typeof maps.wrapClick } }) => void;
    onLoad: () => void;
    onError: () => void;
    mapStyle: string;
  }) {
    useEffect(() => {
      if (maps.status === "LOADED") onLoad();
      if (maps.status === "FAILED") onError();
    }, []);
    return (
      <div data-map data-map-style={mapStyle}>
        <button data-pick onClick={() => onClick({ lngLat: { lat: 0, lng: 240, wrap: maps.wrapClick } })}>Pick location</button>
        {children}
      </div>
    );
  },
  Marker: ({ children, latitude, longitude, draggable, onDragEnd, onClick }: {
    children: ReactNode; latitude: number; longitude: number; draggable?: boolean;
    onDragEnd?: (event: { lngLat: { lat: number; lng: number; wrap: typeof maps.wrapDrag } }) => void;
    onClick?: (event: { originalEvent: MouseEvent }) => void;
  }) => (
    <div data-marker={draggable ? "draft" : "photo"} data-lat={latitude} data-lng={longitude}
      onClick={(event) => onClick?.({ originalEvent: event.nativeEvent })}>
      {children}
      {draggable && <button data-drag onClick={() => onDragEnd?.({ lngLat: { lat: -12, lng: 405, wrap: maps.wrapDrag } })}>Drag draft</button>}
    </div>
  ),
}));
vi.mock("@animate-ui/react/utils/motion", () => ({ useShouldReduceMotion: () => false }));
vi.mock("../../components/animate-ui/icons/map-pin", () => ({
  MapPin: () => <svg aria-hidden="true" />,
}));
vi.mock("../../components/animate-ui/icons/globe", () => ({
  Globe: () => <svg aria-hidden="true" />,
}));
vi.mock("../../components/animate-ui/icons/home", () => ({
  Home: () => <svg aria-hidden="true" />,
}));
vi.mock("../../components/animate-ui/icons/chevron-down", () => ({
  ChevronDown: () => <svg aria-hidden="true" />,
}));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("../../components/ui", () => ({
  Button: ({ busy, variant: _variant, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: string }) => (
    <button {...props} disabled={props.disabled || busy} />
  ),
  Spinner: ({ label = "Loading…" }: { label?: string }) => <p role="status">{label}</p>,
  EmptyState: ({ title, hint }: { title: string; hint?: string }) => <p>{title} {hint}</p>,
  ErrorState: ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
    <div role="alert">{message}{onRetry && <button onClick={onRetry}>Try again</button>}</div>
  ),
  showToast: toasts,
  ConfirmationDialog: ({ title, children, onConfirm, onClose }: {
    title: string; children: ReactNode; onConfirm: () => Promise<void>; onClose: () => void;
  }) => (
    <div role="dialog">
      <h2>{title}</h2>
      {children}
      <button type="button" data-confirm onClick={() => { void onConfirm().then(onClose, () => undefined); }}>Continue</button>
      <button type="button" data-cancel onClick={onClose}>Cancel</button>
    </div>
  ),
}));
vi.mock("../../features/media/services/mediaService", () => ({ mediaService: { list: vi.fn() } }));
vi.mock("../../features/locations/services/locationService", () => ({
  locationService: { set: vi.fn(), scan: vi.fn() },
}));

const photo = (id: string, location: MediaFile["location"], ownerId = "owner"): MediaFile => ({
  id, ownerId, location, originalFilename: `${id}.jpg`, mimeType: "image/jpeg",
  mediaKind: "image", fileSizeBytes: 1200, createdAt: "2026-10-30T00:00:00Z", isFavorited: false,
});
let photos: MediaFile[];

describe("Locations", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;

  const settle = async () => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  };
  const button = (text: string) => [...container.querySelectorAll("button")].find((item) => item.textContent === text)!;
  const confirmDialog = async () => {
    await act(async () => container.querySelector<HTMLButtonElement>("[data-confirm]")!.click());
    await settle();
  };
  const render = async (initialEntry = "/locations") => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <QueryClientProvider client={client}><LocationsPage /></QueryClientProvider>
        </MemoryRouter>,
      );
    });
    await settle();
  };

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "pk.test-browser-token");
    maps.status = "LOADED";
    maps.viewport.getZoom.mockReturnValue(2);
    photos = [photo("gps", { latitude: 0, longitude: 0 }), photo("desktop", null), photo("other", { latitude: -30, longitude: 120 }, "other-owner")];
    vi.mocked(mediaService.list).mockImplementation(async (offset = 0, limit = 100) => ({
      offset, limit, total: photos.length, items: photos.slice(offset, offset + limit),
    }));
    vi.mocked(locationService.set).mockImplementation(async (id, location) => {
      photos = photos.map((item) => item.id === id ? { ...item, location } : item);
    });
    vi.mocked(locationService.scan).mockResolvedValue({
      scanned: 0, located: 0, failedMediaIds: [], nextOffset: 0, hasMore: false,
    });
    useAuthStore.setState({
      user: { id: "owner", username: "Owner", role: "user", status: "active", createdAt: "2026-01-01T00:00:00Z" },
    });
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("renders a marker per located photo, including 0,0, but not null locations", async () => {
    await render();
    expect(container.querySelectorAll('[data-marker="photo"]')).toHaveLength(2);
    expect(container.querySelectorAll(".locations__pin > img")).toHaveLength(2);
    expect(container.querySelectorAll(".locations__pin > svg")).toHaveLength(0);
    expect(container.querySelectorAll(".locations__pin > span")).toHaveLength(0);
    expect(container.querySelectorAll(".locations__popup")).toHaveLength(2);
    expect(container.querySelector('[title="gps.jpg"]')?.closest("[data-marker]")?.getAttribute("data-lat")).toBe("0");
    expect(container.querySelector('[title="gps.jpg"]')?.closest("[data-marker]")?.getAttribute("data-lng")).toBe("0");
    expect(container.textContent).toContain("2 of 3 located");
  });

  it("shows photo details only after a photo is selected", async () => {
    await render();
    expect(container.querySelector(".locations__details")).toBeNull();
    await act(async () => container.querySelector<HTMLButtonElement>(".locations__photo")!.click());
    expect(container.querySelector(".locations__details h2")?.textContent).toBe("gps.jpg");
  });

  it("hides the photo library when no photos exist", async () => {
    photos = [];
    await render();
    expect(container.querySelector(".locations__map-panel")).not.toBeNull();
    expect(container.querySelector(".locations__library-header")).toBeNull();
    expect(container.querySelector(".locations__photos")).toBeNull();
    expect(container.textContent).not.toContain("No photos to show");
  });

  it("shows all photos without a location filter", async () => {
    await render();
    expect(container.querySelectorAll(".locations__photo")).toHaveLength(3);
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it("selects and centers the photo requested by the viewer", async () => {
    await render("/locations?mediaId=gps");
    expect(container.querySelector('.locations__pin[aria-pressed="true"]')?.closest("[data-marker]")?.getAttribute("data-lat")).toBe("0");
    expect(maps.viewport.jumpTo).toHaveBeenCalledWith({ center: [0, 0], zoom: 12 });
  });

  it("automatically loads every media page instead of stopping at the first page", async () => {
    photos = Array.from({ length: 101 }, (_, index) => photo(`photo-${index}`, { latitude: index % 90, longitude: 1 }));
    await render();
    await settle();
    expect(mediaService.list).toHaveBeenCalledWith(100, 100, "image");
    expect(container.querySelectorAll('[data-marker="photo"]')).toHaveLength(90);
    expect(container.querySelectorAll(".locations__pin")).toHaveLength(101);
  });

  it("lets owners pick a map point for a null-location photo and persists it after confirmation", async () => {
    await render();
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__photo")[1].click());
    await act(async () => container.querySelector<HTMLButtonElement>("[data-pick]")!.click());
    expect(maps.wrapClick).toHaveBeenCalled();
    expect(container.querySelector(".locations__coordinates")).toBeNull();
    expect(container.querySelector(".locations__picked strong")?.textContent).toBe("0.000000, -120.000000");
    await act(async () => button("Save location").click());
    expect(container.querySelector('[role="dialog"] h2')?.textContent).toBe("Save this location?");
    expect(locationService.set).not.toHaveBeenCalled();
    await confirmDialog();
    expect(locationService.set).toHaveBeenCalledWith("desktop", { latitude: 0, longitude: -120 });
    expect(container.querySelectorAll('[data-marker="photo"]')).toHaveLength(3);
    expect(toasts.success).toHaveBeenCalledWith("Location saved.");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("clears location and does not offer editing for another owner's photo", async () => {
    await render();
    await act(async () => container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!.click());
    await act(async () => button("Remove location").click());
    expect(container.querySelector('[role="dialog"] h2')?.textContent).toBe("Remove this location?");
    await confirmDialog();
    expect(locationService.set).toHaveBeenCalledWith("gps", null);
    expect(toasts.success).toHaveBeenCalledWith("Location removed.");
    expect(container.querySelectorAll('[data-marker="photo"]')).toHaveLength(1);
    await act(async () => container.querySelector<HTMLButtonElement>('[title="other.jpg"]')!.click());
    expect(container.querySelector("form")).toBeNull();
    expect(container.textContent).toContain("Only the uploader or an administrator");
  });

  it("keeps the save action unavailable until a map point is picked", async () => {
    await render();
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__photo")[1].click());
    expect(button("Save location").disabled).toBe(true);
    expect(container.textContent).toContain("No map point picked yet.");
    await act(async () => container.querySelector<HTMLButtonElement>("[data-pick]")!.click());
    expect(button("Save location").disabled).toBe(false);
  });

  it("cancels a confirmation without saving", async () => {
    await render();
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__photo")[1].click());
    await act(async () => container.querySelector<HTMLButtonElement>("[data-pick]")!.click());
    await act(async () => button("Save location").click());
    await act(async () => container.querySelector<HTMLButtonElement>("[data-cancel]")!.click());
    expect(locationService.set).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("allows administrators to edit other uploaders' locations", async () => {
    useAuthStore.setState({ user: { ...useAuthStore.getState().user!, role: "admin" } });
    await render();
    await act(async () => container.querySelector<HTMLButtonElement>('[title="other.jpg"]')!.click());
    expect(container.querySelector("form")).not.toBeNull();
  });

  it("scans successive batches using nextOffset and reports individual failures", async () => {
    vi.mocked(locationService.scan)
      .mockResolvedValueOnce({ scanned: 24, located: 10, failedMediaIds: ["desktop"], nextOffset: 1, hasMore: true })
      .mockResolvedValueOnce({ scanned: 3, located: 1, failedMediaIds: [], nextOffset: 1, hasMore: false });
    await render();
    await act(async () => button("Scan existing photos").click());
    await settle();
    expect(locationService.scan).toHaveBeenNthCalledWith(1, 0, expect.any(AbortSignal));
    expect(locationService.scan).toHaveBeenNthCalledWith(2, 1, expect.any(AbortSignal));
    expect(container.textContent).toContain("Scanned 27 photos; found 11 locations.");
    expect(container.textContent).toContain("1 photos could not be scanned");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("desktop.jpg");
  });

  it("surfaces API errors instead of showing scan success", async () => {
    vi.mocked(locationService.scan).mockRejectedValue(new Error("Disk unavailable"));
    await render();
    await act(async () => button("Scan existing photos").click());
    await settle();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Disk unavailable");
    expect(container.textContent).not.toContain("found 0 locations");
  });

  it("shows failed location saves and keeps the original marker", async () => {
    vi.mocked(locationService.set).mockRejectedValueOnce(new Error("Cannot save location"));
    await render();
    await act(async () => container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!.click());
    await act(async () => container.querySelector<HTMLButtonElement>("[data-pick]")!.click());
    await act(async () => button("Save location").click());
    await confirmDialog();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Cannot save location");
    expect(container.querySelector('[title="gps.jpg"]')?.closest("[data-marker]")?.getAttribute("data-lng")).toBe("0");
    expect(toasts.success).not.toHaveBeenCalled();
  });

  it("prevents switching photos while a save is pending", async () => {
    let finish!: () => void;
    vi.mocked(locationService.set).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    await render();
    await act(async () => container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!.click());
    await act(async () => button("Save location").click());
    await act(async () => container.querySelector<HTMLButtonElement>("[data-confirm]")!.click());
    await vi.waitFor(() => expect(
      [...container.querySelectorAll<HTMLButtonElement>(".locations__photo")].every((item) => item.disabled),
    ).toBe(true));
    await act(async () => container.querySelector<HTMLButtonElement>('[title="other.jpg"]')!.click());
    expect(container.querySelector(".locations__details h2")?.textContent).toBe("gps.jpg");
    await act(async () => finish());
    await settle();
  });

  it("resizes the map when its container changes width", async () => {
    const observers: Array<() => void> = [];
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { observers.push(callback); }
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    await render();
    maps.viewport.resize.mockClear();
    expect(observers.length).toBeGreaterThan(0);
    await act(async () => observers.forEach((notify) => notify()));
    expect(maps.viewport.resize).toHaveBeenCalled();
  });

  it("aborts an unfinished scan when leaving the page", async () => {
    let signal: AbortSignal | undefined;
    vi.mocked(locationService.scan).mockImplementationOnce((_, currentSignal) => {
      signal = currentSignal;
      return new Promise((_, reject) => {
        currentSignal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    await render();
    await act(async () => button("Scan existing photos").click());
    expect(signal?.aborted).toBe(false);
    await act(async () => root.unmount());
    expect(signal?.aborted).toBe(true);
    expect(locationService.scan).toHaveBeenCalledTimes(1);
  });

  it("explains that locations need the map when no token is configured", async () => {
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "");
    await render();
    expect(container.textContent).toContain("Set VITE_MAPBOX_ACCESS_TOKEN");
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__photo")[1].click());
    expect(container.querySelector(".locations__coordinates")).toBeNull();
    expect(button("Save location").disabled).toBe(true);
  });

  it("shows a clear error for Mapbox load failure and blocks saving without a picked point", async () => {
    maps.status = "FAILED";
    await render();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Mapbox could not load");
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__photo")[1].click());
    expect(container.querySelector(".locations__coordinates")).toBeNull();
    expect(button("Save location").disabled).toBe(true);
  });

  it("rejects secret tokens without mounting the map", async () => {
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "sk.not-a-public-token");
    await render();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("public access token starting with pk.");
    expect(container.querySelector("[data-map]")).toBeNull();
  });

  it("shows loading feedback until the map loads", async () => {
    maps.status = "LOADING";
    await render();
    expect(container.textContent).toContain("Loading map…");
    expect(maps.viewport.fitBounds).not.toHaveBeenCalled();
  });

  it("fits all photo coordinates after loading and focuses a selected pin", async () => {
    await render();
    expect(maps.viewport.fitBounds).toHaveBeenCalledWith(
      [[0, -30], [120, 0]], { padding: 48, maxZoom: 16, duration: 0 },
    );
    await act(async () => container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!.click());
    expect(maps.viewport.jumpTo).toHaveBeenLastCalledWith({ center: [0, 0], zoom: 12 });
    expect(container.querySelector('[title="gps.jpg"]')?.getAttribute("aria-pressed")).toBe("true");
  });

  it("defaults to the 3D basemap and zooms toward the selected location", async () => {
    await render();
    await act(async () => container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!.click());
    expect(container.querySelector("[data-map]")?.getAttribute("data-map-style"))
      .toBe("mapbox://styles/mapbox/standard");
    expect(maps.viewport.easeTo).toHaveBeenLastCalledWith({
      center: [0, 0], zoom: 15, pitch: 55, bearing: -20, duration: 400,
    });
    expect(container.querySelectorAll<HTMLButtonElement>(".locations__scene")[1].getAttribute("aria-pressed")).toBe("true");
  });

  it("switches between street and 3D views without resetting the collapsed settings", async () => {
    await render();
    const settings = container.querySelector<HTMLDetailsElement>(".locations__scenes")!;
    expect(settings.open).toBe(false);
    await act(async () => { settings.open = true; });
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__scene")[0].click());
    expect(container.querySelector("[data-map]")?.getAttribute("data-map-style"))
      .toBe("mapbox://styles/mapbox/streets-v12");
    expect(maps.viewport.easeTo).toHaveBeenLastCalledWith({ pitch: 0, bearing: 0, duration: 400 });
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__scene")[1].click());
    expect(container.querySelector("[data-map]")?.getAttribute("data-map-style"))
      .toBe("mapbox://styles/mapbox/standard");
    expect(settings.open).toBe(true);
  });

  it("updates and saves the draft after dragging its marker", async () => {
    await render();
    await act(async () => container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!.click());
    await act(async () => container.querySelector<HTMLButtonElement>("[data-drag]")!.click());
    expect(maps.wrapDrag).toHaveBeenCalled();
    expect(container.querySelector(".locations__picked strong")?.textContent).toBe("-12.000000, 45.000000");
    await act(async () => button("Save location").click());
    await confirmDialog();
    expect(locationService.set).toHaveBeenCalledWith("gps", { latitude: -12, longitude: 45 });
  });

  it("groups nearby photos into one fanned marker and expands it on demand", async () => {
    photos = [
      photo("near-a", { latitude: 10, longitude: 10 }),
      photo("near-b", { latitude: 10.0001, longitude: 10.0001 }),
      photo("far", { latitude: -40, longitude: 70 }),
    ];
    await render();
    const markers = container.querySelectorAll('[data-marker="photo"]');
    expect(markers).toHaveLength(2);
    const cluster = container.querySelector(".locations__cluster--group")!;
    expect(cluster.querySelectorAll(".locations__pin")).toHaveLength(2);
    expect(cluster.getAttribute("data-open")).toBe("false");
    const toggle = cluster.querySelector<HTMLButtonElement>(".locations__cluster-toggle")!;
    expect(toggle.textContent).toBe("2");
    await act(async () => toggle.click());
    expect(container.querySelector(".locations__cluster--group")?.getAttribute("data-open")).toBe("true");
  });

  it("keeps a grouped marker expanded while one of its photos is selected", async () => {
    photos = [
      photo("near-a", { latitude: 10, longitude: 10 }),
      photo("near-b", { latitude: 10.0001, longitude: 10.0001 }),
    ];
    await render();
    await act(async () => container.querySelector<HTMLButtonElement>('[title="near-b.jpg"]')!.click());
    const cluster = container.querySelector(".locations__cluster--group")!;
    expect(cluster.getAttribute("data-open")).toBe("true");
    expect(cluster.getAttribute("data-selected")).toBe("true");
    expect(cluster.querySelector(".locations__pin")?.getAttribute("title")).toBe("near-b.jpg");
    expect(container.querySelector(".locations__details h2")?.textContent).toBe("near-b.jpg");
  });
});
