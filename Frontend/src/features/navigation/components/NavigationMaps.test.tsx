// @vitest-environment jsdom
import { act, useEffect, type ReactNode, type ButtonHTMLAttributes } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlaceMap } from "../../place/components/PlaceMap";
import { LocationMap } from "../../locations/components/LocationMap";
import type { Place } from "../../place/types";
import type { MediaFile } from "../../media/types";

const viewport = vi.hoisted(() => ({
  failed: false,
  jumpTo: vi.fn(), easeTo: vi.fn(), fitBounds: vi.fn(), resize: vi.fn(),
  setCooperativeGestures: vi.fn(),
  on: vi.fn(), off: vi.fn(),
  project: vi.fn(() => ({ x: 0, y: 0 })),
  getMap: () => viewport,
  getBounds: () => ({ getWest: () => 170, getEast: () => 190, getSouth: () => -20, getNorth: () => 30 }),
  getContainer: () => document.body,
  getZoom: () => 12,
}));
vi.mock("react-map-gl/mapbox", () => ({
  useMap: () => ({ current: viewport }),
  GeolocateControl: () => null,
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Source: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Layer: () => null,
  default: function MockMap({ children, onLoad, onError, onClick }: {
    children: ReactNode;
    onLoad: (event: { target: typeof viewport }) => void;
    onError: () => void;
    onClick: (event: { lngLat: { wrap: () => { lat: number; lng: number } } }) => void;
  }) {
    useEffect(() => { if (viewport.failed) onError(); else onLoad({ target: viewport }); }, []);
    return <div>
      <button onClick={() => onClick({ lngLat: { wrap: () => ({ lat: 1, lng: 2 }) } })}>Map click</button>
      {children}
    </div>;
  },
}));
vi.mock("@animate-ui/react/utils/motion", () => ({ useShouldReduceMotion: () => false }));
vi.mock("../../../hooks/useMediaQuery", () => ({ useMediaQuery: () => false }));
vi.mock("../../../components/animate-ui/icons/icon", () => ({
  AnimateIcon: ({ children }: { children: ReactNode }) => children,
  AnimatedAction: ({ children }: { children: ReactNode }) => children,
  IconWrapper: () => <svg aria-hidden="true" />,
  useAnimateIconOnChange: () => 0,
}));
vi.mock("../../../components/ui", () => ({
  Button: ({ busy, variant: _variant, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: string }) =>
    <button {...props} disabled={props.disabled || busy} />,
  ErrorState: ({ message }: { message: string }) => <p role="alert">{message}</p>,
  Spinner: () => <span>Loading</span>,
  showToast: { error: vi.fn() },
}));
vi.mock("../../locations/components/MapAppearanceSettings", () => ({
  getMapAppearanceConfig: () => ({}),
  useMapAppearance: () => ({}),
  MapAppearanceSettings: () => null,
  MapAppearanceConfig: () => null,
}));
vi.mock("../../locations/components/LocationSearch", () => ({ LocationSearch: () => null }));

const coordinate = { latitude: 0, longitude: 0.01 };
const photo: MediaFile = {
  id: "travel", location: coordinate, originalFilename: "Holiday.jpg", mediaKind: "image",
  fileSizeBytes: 1, mimeType: "image/jpeg", isFavorited: false, createdAt: "",
};
const place: Place = {
  id: "place", ...coordinate, name: "Lunch", address: "", note: "", rating: 0,
  markerColor: "#1769d2", markerIcon: "", mediaIds: [], createdAt: "", updatedAt: null,
  owner: { id: "owner", username: "owner" },
};

describe.each(["travel", "place"] as const)("%s map navigation integration", (kind) => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  const pick = vi.fn();
  const boundsChanged = vi.fn();
  const button = (text: string) => [...document.body.querySelectorAll("button")].find((item) => item.textContent?.trim() === text)!;
  const click = async (text: string) => { await act(async () => { button(text).click(); }); };
  const render = async (selected = true) => {
    const shared = {
      homeLocation: null, homeLocationReady: true, homePicking: false, homeActionDisabled: false,
      onPickHome: vi.fn(), onHomeClick: vi.fn(), onPick: pick, onSelect: vi.fn(), onBoundsChange: boundsChanged,
    };
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        {kind === "travel" ? (
          <LocationMap {...shared} media={[photo]} selected={selected ? photo : undefined}
            draft={coordinate} editable canMove={() => true} onMove={vi.fn()}
            onEdit={vi.fn()} onCancelSelection={vi.fn()} onAddPhotos={vi.fn()} onOpenCamera={vi.fn()} />
        ) : (
          <PlaceMap {...shared} onAddToolbarChange={vi.fn()} places={[place]} selectedId={selected ? place.id : null}
            draft={null} picking={false} canChange={() => true} onMove={vi.fn()} onDelete={vi.fn()}
            canMovePhoto={() => true} onSelectPhoto={vi.fn()} onMovePhoto={vi.fn()} onEditPhoto={vi.fn()}
            onConfirmPhotoMove={vi.fn()} onEdit={vi.fn()} onEditDraft={vi.fn()} onCancelSelection={vi.fn()}
            onCancelDraft={vi.fn()} onCreateAtCurrentLocation={vi.fn()} onAddPhotos={vi.fn()} />
        )}
      </QueryClientProvider>,
    ));
  };

  beforeEach(async () => {
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "pk.test");
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    client = new QueryClient();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await render();
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    vi.clearAllMocks();
    viewport.failed = false;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("offers both providers for the selected destination, including editable travel photos", async () => {
    expect(boundsChanged).toHaveBeenCalledWith({ west: 170, south: -20, east: -170, north: 30 });
    await click("Navigate");
    expect(document.body.textContent).not.toContain(kind === "travel" ? "Directions to Holiday.jpg" : "Directions to Lunch");
    expect(document.body.querySelector("a")?.textContent).toBe("Open Google Maps");
    expect(button("Preview with Mapbox")).toBeDefined();
    expect(new URL(document.body.querySelector("a")!.href).searchParams.get("destination")).toBe("0,0.01");
  });

  it("prevents map clicks from editing destinations while navigation is open", async () => {
    await click("Navigate");
    await click("Map click");
    expect(pick).not.toHaveBeenCalled();
    await click("Navigate");
    await click("Map click");
    expect(pick).toHaveBeenCalledOnce();
  });

  it("removes navigation when the destination is deselected", async () => {
    await click("Navigate");
    await render(false);
    expect(document.body.querySelector('.map-navigation[data-expanded="true"]')).toBeNull();
  });

  it.each(["", "sk.invalid"])("keeps Google directions available without a usable Mapbox token (%s)", async (token) => {
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", token);
    await render();
    expect(container.textContent).toContain("Mapbox navigation is unavailable");
    const link = container.querySelector("a")!;
    expect(new URL(link.href).searchParams.get("destination")).toBe("0,0.01");
    expect(container.querySelector(".map-navigation__mode-trigger")?.textContent).toContain("Driving");
    expect(button("Preview with Mapbox")).toBeUndefined();
  });

  it("keeps Google directions available when the map fails to load", async () => {
    viewport.failed = true;
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "pk.failed");
    await render();
    expect(container.textContent).toContain("Mapbox could not load");
    expect(container.querySelector("a")?.textContent).toBe("Open Google Maps");
  });
});
