// @vitest-environment jsdom
import { act, useEffect, type ReactNode, type ButtonHTMLAttributes } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FoodMap } from "../../food/components/FoodMap";
import { LocationMap } from "../../locations/components/LocationMap";
import type { FoodPlace } from "../../food/types";
import type { MediaFile } from "../../media/types";

const viewport = vi.hoisted(() => ({
  failed: false,
  jumpTo: vi.fn(), easeTo: vi.fn(), fitBounds: vi.fn(), resize: vi.fn(),
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
    onLoad: () => void;
    onError: () => void;
    onClick: (event: { lngLat: { wrap: () => { lat: number; lng: number } } }) => void;
  }) {
    useEffect(() => { if (viewport.failed) onError(); else onLoad(); }, []);
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
  IconWrapper: () => <svg aria-hidden="true" />,
}));
vi.mock("../../../components/ui", () => ({
  Button: ({ busy, variant: _variant, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: string }) =>
    <button {...props} disabled={props.disabled || busy} />,
  ErrorState: ({ message }: { message: string }) => <p role="alert">{message}</p>,
  Spinner: () => <span>Loading</span>,
  showToast: { error: vi.fn() },
}));
vi.mock("../../locations/components/MapAppearanceSettings", () => ({
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
const place: FoodPlace = {
  id: "food", ...coordinate, name: "Lunch", address: "", note: "", rating: 0,
  markerColor: "#1769d2", markerIcon: "", mediaIds: [], createdAt: "", updatedAt: null,
  owner: { id: "owner", username: "owner" },
};

describe.each(["travel", "food"] as const)("%s map navigation integration", (kind) => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  const pick = vi.fn();
  const button = (text: string) => [...container.querySelectorAll("button")].find((item) => item.textContent === text)!;
  const click = async (text: string) => { await act(async () => { button(text).click(); }); };
  const render = async (selected = true) => {
    const shared = {
      homeLocation: null, homeLocationReady: true, homePicking: false, homeActionDisabled: false,
      onPickHome: vi.fn(), onHomeClick: vi.fn(), onPick: pick, onSelect: vi.fn(),
    };
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        {kind === "travel" ? (
          <LocationMap {...shared} media={[photo]} selected={selected ? photo : undefined}
            draft={coordinate} editable canMove={() => true} onMove={vi.fn()} />
        ) : (
          <FoodMap {...shared} places={[place]} selectedId={selected ? place.id : null}
            draft={null} draftIcon="" draftColor="" picking={false} />
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
    await click("Navigate");
    expect(container.textContent).toContain(kind === "travel" ? "Directions to Holiday.jpg" : "Directions to Lunch");
    expect(container.querySelector("a")?.textContent).toBe("Open Google Maps");
    expect(button("Preview with Mapbox")).toBeDefined();
    expect(new URL(container.querySelector("a")!.href).searchParams.get("destination")).toBe("0,0.01");
  });

  it("prevents map clicks from editing destinations while navigation is open", async () => {
    await click("Navigate");
    await click("Map click");
    expect(pick).not.toHaveBeenCalled();
    await act(async () => { container.querySelector<HTMLButtonElement>('[aria-label="Close navigation"]')!.click(); });
    await click("Map click");
    expect(pick).toHaveBeenCalledOnce();
  });

  it("removes navigation when the destination is deselected", async () => {
    await click("Navigate");
    await render(false);
    expect(container.querySelector(".map-navigation")).toBeNull();
  });

  it.each(["", "sk.invalid"])("keeps Google directions available without a usable Mapbox token (%s)", async (token) => {
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", token);
    await render();
    expect(container.textContent).toContain("Mapbox navigation is unavailable");
    const link = container.querySelector("a")!;
    expect(new URL(link.href).searchParams.get("destination")).toBe("0,0.01");
    expect(container.querySelector("select")?.value).toBe("driving");
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
