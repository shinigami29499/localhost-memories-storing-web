// @vitest-environment jsdom
import { act, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../store/authStore";
import { mediaService } from "../../features/media/services/mediaService";
import { locationService } from "../../features/locations/services/locationService";
import { homeLocationService } from "../../features/locations/services/homeLocationService";
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
    unproject: vi.fn(() => ({ wrap: () => ({ lat: 21, lng: 105 }) })),
    getContainer: vi.fn(() => maps.container ?? document.body),
    isStyleLoaded: vi.fn(() => true),
    getConfig: vi.fn(() => ({})),
    setConfig: vi.fn(),
  },
}));
vi.mock("react-map-gl/mapbox", () => ({
  useMap: () => ({ current: maps.viewport }),
  GeolocateControl: () => <div data-geolocate />,
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
vi.mock("@animate-ui/react/utils/motion", () => ({
  useShouldReduceMotion: () => false,
  useTempoTransition: () => ({ duration: 0, ease: [] }),
  motionTokens: { transition: { reveal: {} } },
}));
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
  Input: ({ value = "", onChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
    onChange?: (value: string) => void;
  }) => <input {...props} value={value} onChange={(event) => onChange?.(event.target.value)} />,
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
vi.mock("../../features/locations/services/homeLocationService", () => ({
  homeLocationService: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
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
  const render = async (initialEntry = "/location/travel") => {
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
    vi.mocked(homeLocationService.get).mockResolvedValue(null);
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

  it("does not render home-location or scan header actions", async () => {
    await render();
    expect(container.querySelector(".locations__header-actions")).toBeNull();
  });

  it("shows photo details only after a photo is selected", async () => {
    await render();
    expect(container.querySelector(".locations__details")).toBeNull();
    await act(async () => container.querySelector<HTMLButtonElement>(".locations__photo")!.click());
    expect(container.querySelector(".locations__details h2")?.textContent).toBe("gps.jpg");
  });

  it.each(["/location/travel", "/location/travel?mediaId=gps", "/location/travel?mediaId=desktop"])(
    "keeps mobile photo previews read-only at %s",
    async (entry) => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query === "(max-width: 640px)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      await render(entry);
      expect(container.querySelector(".locations__header h1")?.textContent).toBe("Travel.");
      expect(container.querySelector(".locations__header p")?.textContent).toBe("Browse images and videos in your library.");
      expect(container.querySelector(".locations__hint")?.textContent)
        .toBe("Mapbox requires internet access and receives map coordinates. Photos stay on this server.");
      expect(container.querySelector(".locations__photos")).toBeNull();
      expect(container.querySelector(".locations__details")).toBeNull();
      expect(container.querySelector('[data-marker="draft"]')).toBeNull();

      const pin = container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!;
      if (pin.getAttribute("aria-pressed") !== "true") {
        await act(async () => pin.click());
      }
      expect(pin.getAttribute("aria-pressed")).toBe("true");
      expect(container.querySelector('.locations__marker[data-selected="true"] .locations__popup')).not.toBeNull();
      expect(container.querySelector(".locations__workspace--map-only")).not.toBeNull();
      expect(container.querySelector(".locations__details")).toBeNull();
      expect(container.querySelector('[data-marker="draft"]')).toBeNull();
      expect(maps.viewport.jumpTo).toHaveBeenLastCalledWith({
        center: [0, 0], zoom: 12,
        padding: { top: 180, bottom: 0, left: 0, right: 0 }, retainPadding: false,
      });
      expect(maps.viewport.easeTo).toHaveBeenLastCalledWith({
        center: [0, 0], zoom: 18, pitch: 55, bearing: -20, duration: 400,
        padding: { top: 180, bottom: 0, left: 0, right: 0 }, retainPadding: false,
      });
      await act(async () => container.querySelector<HTMLButtonElement>("[data-pick]")!.click());
      expect(container.querySelector('[data-marker="draft"]')).toBeNull();
      expect(locationService.set).not.toHaveBeenCalled();
      expect(pin.getAttribute("aria-pressed")).toBe("false");
      expect(container.querySelector(".locations__details")).toBeNull();
    },
  );

  it.each([false, true])("dismisses a photo preview on an outside tap (mobile: %s)", async (mobile) => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: mobile && query === "(max-width: 640px)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    await render();
    const pin = container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!;
    await act(async () => { pin.focus(); pin.click(); });
    expect(pin.getAttribute("aria-pressed")).toBe("true");
    maps.viewport.jumpTo.mockClear();
    maps.viewport.easeTo.mockClear();
    maps.viewport.fitBounds.mockClear();
    await act(async () => container.querySelector<HTMLElement>(".locations__header")!.click());
    expect(pin.getAttribute("aria-pressed")).toBe("false");
    expect(document.activeElement).not.toBe(pin);
    expect(container.querySelector(".locations__details")).toBeNull();
    expect(maps.viewport.jumpTo).not.toHaveBeenCalled();
    expect(maps.viewport.easeTo).not.toHaveBeenCalled();
    expect(maps.viewport.fitBounds).not.toHaveBeenCalled();
    expect(locationService.set).not.toHaveBeenCalled();
  });

  it("deselects a photo when its tile is clicked again", async () => {
    await render();
    const tile = container.querySelector<HTMLButtonElement>(".locations__photo")!;
    await act(async () => tile.click());
    await act(async () => tile.click());
    expect(container.querySelector(".locations__details")).toBeNull();
    expect(tile.getAttribute("aria-pressed")).toBe("false");
  });

  it("zooms on marker selection but leaves the camera unchanged on a second tap", async () => {
    await render();
    const pin = container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!;
    await act(async () => pin.click());
    expect(maps.viewport.easeTo).toHaveBeenLastCalledWith({
      center: [0, 0], zoom: 18, pitch: 55, bearing: -20, duration: 400,
    });
    maps.viewport.jumpTo.mockClear();
    maps.viewport.easeTo.mockClear();
    maps.viewport.fitBounds.mockClear();
    await act(async () => pin.click());
    expect(pin.getAttribute("aria-pressed")).toBe("false");
    expect(maps.viewport.jumpTo).not.toHaveBeenCalled();
    expect(maps.viewport.easeTo).not.toHaveBeenCalled();
    expect(maps.viewport.fitBounds).not.toHaveBeenCalled();
    await act(async () => pin.click());
    expect(pin.getAttribute("aria-pressed")).toBe("true");
    expect(maps.viewport.easeTo).toHaveBeenLastCalledWith({
      center: [0, 0], zoom: 18, pitch: 55, bearing: -20, duration: 400,
    });
  });

  it("lets a deep-linked photo be deselected", async () => {
    await render("/location/travel?mediaId=gps");
    const tile = container.querySelector<HTMLButtonElement>(".locations__photo")!;
    expect(container.querySelector(".locations__details h2")?.textContent).toBe("gps.jpg");
    await act(async () => tile.click());
    expect(container.querySelector(".locations__details")).toBeNull();
  });

  it.each(["Escape", "outside"])("exits deep-linked desktop selection with %s", async (action) => {
    await render("/location/travel?mediaId=gps");
    expect(container.querySelector(".locations__details")).not.toBeNull();
    await act(async () => container.querySelector<HTMLButtonElement>("[data-pick]")!.click());
    maps.viewport.jumpTo.mockClear();
    maps.viewport.easeTo.mockClear();
    await act(async () => {
      if (action === "Escape") document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      else container.querySelector(".locations__header")!.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    await settle();
    expect(container.querySelector(".locations__details")).toBeNull();
    expect(container.querySelector('[data-marker="draft"]')).toBeNull();
    expect(container.querySelector('.locations__photo[aria-pressed="true"]')).toBeNull();
    expect(maps.viewport.jumpTo).not.toHaveBeenCalled();
    expect(maps.viewport.easeTo).not.toHaveBeenCalled();
    expect(locationService.set).not.toHaveBeenCalled();
  });

  it("cancels a location draft without moving the camera", async () => {
    await render("/location/travel?mediaId=gps");
    await act(async () => container.querySelector<HTMLButtonElement>("[data-pick]")!.click());
    maps.viewport.jumpTo.mockClear();
    maps.viewport.easeTo.mockClear();
    await act(async () => button("Cancel").click());
    await settle();
    expect(container.querySelector(".locations__details")).toBeNull();
    expect(container.querySelector('[data-marker="draft"]')).toBeNull();
    expect(maps.viewport.jumpTo).not.toHaveBeenCalled();
    expect(maps.viewport.easeTo).not.toHaveBeenCalled();
    expect(locationService.set).not.toHaveBeenCalled();
  });

  it("keeps desktop selection for map, details, and photo tile interactions", async () => {
    await render("/location/travel?mediaId=gps");
    for (const selector of ["[data-pick]", ".locations__details h2", ".locations__photo"]) {
      await act(async () => {
        container.querySelector(selector)!.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      });
      expect(container.querySelector(".locations__details")).not.toBeNull();
    }
    await act(async () => container.querySelector<HTMLButtonElement>("[data-pick]")!.click());
    expect(container.querySelector(".locations__picked strong")?.textContent).toBe("0.000000, -120.000000");
  });

  it("does not dismiss desktop selection while a confirmation dialog is open", async () => {
    await render("/location/travel?mediaId=gps");
    await act(async () => button("Save location").click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    expect(container.querySelector(".locations__details")).not.toBeNull();
  });

  it("closes map settings before exiting desktop selection with Escape", async () => {
    await render("/location/travel?mediaId=gps");
    const settings = container.querySelector<HTMLDetailsElement>(".locations__scenes")!;
    await act(async () => { settings.open = true; });
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(settings.open).toBe(false);
    expect(container.querySelector(".locations__details")).not.toBeNull();
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector(".locations__details")).toBeNull();
  });

  it("focuses a located photo without selecting it or requesting device location", async () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
    await render("/location/travel?focusMediaId=gps");
    expect(maps.viewport.jumpTo).toHaveBeenLastCalledWith({ center: [0, 0], zoom: 12 });
    expect(maps.viewport.easeTo).toHaveBeenLastCalledWith({
      center: [0, 0], zoom: 18, pitch: 55, bearing: -20, duration: 400,
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(container.querySelector(".locations__details")).toBeNull();
    expect(container.querySelector('[data-marker="draft"]')).toBeNull();
    expect(container.querySelector('.locations__photo[aria-pressed="true"]')).toBeNull();

    await act(async () => container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!.click());
    expect(container.querySelector(".locations__details")).toBeNull();
    expect(container.querySelector('[data-marker="draft"]')).toBeNull();
    await act(async () => container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!.click());
    expect(container.querySelector(".locations__details")).toBeNull();
  });

  it("selects an unlocated photo and centers on device location without placing a draft", async () => {
    const getCurrentPosition = vi.fn((success: (position: {
      coords: { latitude: number; longitude: number };
    }) => void) => success({
      coords: { latitude: 21, longitude: 105 },
    }));
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
    await render("/location/travel?mediaId=desktop");
    expect(getCurrentPosition).toHaveBeenCalled();
    expect(maps.viewport.easeTo).toHaveBeenCalledWith({
      center: [105, 21], zoom: 14, duration: 0,
    });
    expect(maps.viewport.fitBounds).not.toHaveBeenCalled();
    expect(container.querySelector(".locations__details h2")?.textContent).toBe("desktop.jpg");
    expect(container.querySelector('[data-marker="draft"]')).toBeNull();
    expect(button("Save location").disabled).toBe(true);
  });

  it("ignores a pending device location after a photo location takes focus", async () => {
    let locate: ((position: { coords: { latitude: number; longitude: number } }) => void) | undefined;
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: vi.fn((success: typeof locate) => { locate = success; }),
      },
    });
    await render("/location/travel?mediaId=desktop");
    expect(locate).toBeDefined();
    await act(async () => container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!.click());
    maps.viewport.easeTo.mockClear();
    await act(async () => locate!({ coords: { latitude: 21, longitude: 105 } }));
    expect(maps.viewport.easeTo).not.toHaveBeenCalled();
    expect(container.querySelector(".locations__details")).toBeNull();
    expect(container.querySelector('[title="gps.jpg"]')?.getAttribute("aria-pressed")).toBe("true");
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
    expect(container.querySelector(".locations__photo")?.getAttribute("aria-label")).toBe("gps.jpg");
    expect(container.querySelector(".locations__photos")?.textContent).not.toContain("gps.jpg");
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it("selects and centers the photo requested by the viewer", async () => {
    await render("/location/travel?mediaId=gps");
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
    await render("/location/travel?mediaId=desktop");
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
    expect(container.querySelector(".locations__details")).toBeNull();
    expect(container.querySelector('[data-marker="draft"]')).toBeNull();
    expect(container.querySelector('.locations__photo[aria-pressed="true"]')).toBeNull();
    await settle();
    expect(container.querySelector(".locations__details")).toBeNull();
  });

  it("clears location and does not offer editing for another owner's photo", async () => {
    await render();
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__photo")[0].click());
    await act(async () => button("Remove location").click());
    expect(container.querySelector('[role="dialog"] h2')?.textContent).toBe("Remove this location?");
    await confirmDialog();
    expect(locationService.set).toHaveBeenCalledWith("gps", null);
    expect(toasts.success).toHaveBeenCalledWith("Location removed.");
    expect(container.querySelectorAll('[data-marker="photo"]')).toHaveLength(1);
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__photo")[2].click());
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
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__photo")[2].click());
    expect(container.querySelector("form")).not.toBeNull();
  });

  it("shows failed location saves and keeps the original marker", async () => {
    vi.mocked(locationService.set).mockRejectedValueOnce(new Error("Cannot save location"));
    await render();
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__photo")[0].click());
    await act(async () => container.querySelector<HTMLButtonElement>("[data-pick]")!.click());
    await act(async () => button("Save location").click());
    await confirmDialog();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Cannot save location");
    expect(container.querySelector('[title="gps.jpg"]')?.closest("[data-marker]")?.getAttribute("data-lng")).toBe("0");
    expect(toasts.success).not.toHaveBeenCalled();
    expect(container.querySelector(".locations__details h2")?.textContent).toBe("gps.jpg");
    expect(container.querySelector('[data-marker="draft"]')).not.toBeNull();
  });

  it("prevents switching photos while a save is pending", async () => {
    let finish!: () => void;
    vi.mocked(locationService.set).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    await render();
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__photo")[0].click());
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
      center: [0, 0], zoom: 18, pitch: 55, bearing: -20, duration: 400,
    });
    expect(container.querySelectorAll<HTMLButtonElement>(".locations__scene")[1].getAttribute("aria-pressed")).toBe("true");
  });

  it("zooms close to a selected marker in flat street view", async () => {
    await render();
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__scene")[0].click());
    await act(async () => container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!.click());
    expect(maps.viewport.easeTo).toHaveBeenLastCalledWith({
      center: [0, 0], zoom: 18, pitch: 0, bearing: 0, duration: 400,
    });
  });

  it("clears photo focus and resets the camera when returning home", async () => {
    vi.mocked(homeLocationService.get).mockResolvedValue({ latitude: 21, longitude: 105 });
    await render("/location/travel?mediaId=gps");
    const settings = container.querySelector<HTMLDetailsElement>(".locations__scenes")!;
    await act(async () => { settings.open = true; });
    await act(async () => container.querySelector<HTMLButtonElement>(".locations__map-home-control")!.click());
    expect(container.querySelector(".locations__details")).toBeNull();
    expect(container.querySelector('.locations__pin[aria-pressed="true"]')).toBeNull();
    expect(container.querySelector("[data-map]")?.getAttribute("data-map-style"))
      .toBe("mapbox://styles/mapbox/streets-v12");
    expect(settings.open).toBe(false);
    expect(maps.viewport.easeTo).toHaveBeenLastCalledWith({
      center: [105, 21], zoom: 18, pitch: 0, bearing: 0,
      padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 400,
    });
    await act(async () => container.querySelector<HTMLButtonElement>(".locations__map-home-control")!.click());
    expect(maps.viewport.easeTo).toHaveBeenLastCalledWith({
      center: [105, 21], zoom: 18, pitch: 0, bearing: 0,
      padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 400,
    });
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
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".locations__photo")[0].click());
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
    expect(container.querySelector(".locations__details")).toBeNull();
    expect(container.querySelector('[data-marker="draft"]')).toBeNull();
  });

  it("opens editing at the dropped photo pin without saving or toggling selection", async () => {
    await render();
    const pin = container.querySelector<HTMLButtonElement>('[title="gps.jpg"]')!;
    pin.setPointerCapture = vi.fn();
    pin.releasePointerCapture = vi.fn();
    const pointer = (type: string, x: number, y: number) => Object.assign(
      new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }),
      { pointerId: 1, isPrimary: true },
    );
    await act(async () => pin.dispatchEvent(pointer("pointerdown", 100, 100)));
    await act(async () => pin.dispatchEvent(pointer("pointermove", 120, 130)));
    expect(pin.style.translate).toBe("20px 30px");
    await act(async () => pin.dispatchEvent(pointer("pointerup", 120, 130)));
    expect(maps.viewport.unproject).toHaveBeenLastCalledWith([20, 30]);
    expect(container.querySelector(".locations__details h2")?.textContent).toBe("gps.jpg");
    expect(container.querySelector(".locations__picked strong")?.textContent).toBe("21.000000, 105.000000");
    expect(locationService.set).not.toHaveBeenCalled();
    await act(async () => pin.click());
    expect(container.querySelector(".locations__details h2")?.textContent).toBe("gps.jpg");
  });

  it("does not allow dragging another owner's photo pin", async () => {
    await render();
    const pin = container.querySelector<HTMLButtonElement>('[title="other.jpg"]')!;
    expect(pin.dataset.movable).toBe("false");
    await act(async () => pin.click());
    expect(container.querySelector(".locations__details")).toBeNull();
    expect(locationService.set).not.toHaveBeenCalled();
  });
});
