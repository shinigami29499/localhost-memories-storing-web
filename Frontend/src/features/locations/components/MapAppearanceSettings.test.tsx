// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMapAppearanceConfig,
  MapAppearanceConfig,
  type MapColorTheme,
  type MapLighting,
  useMapAppearance,
} from "./MapAppearanceSettings";

const map = vi.hoisted(() => ({
  isStyleLoaded: vi.fn(() => true),
  getConfig: vi.fn(() => ({})),
  setConfig: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));

vi.mock("react-map-gl/mapbox", () => ({
  useMap: () => ({ current: { getMap: () => map } }),
}));

function MapAppearanceDefaults() {
  const { lighting, colorTheme } = useMapAppearance();
  return <div data-appearance>{lighting}:{colorTheme}</div>;
}

describe("MapAppearanceConfig", () => {
  let container: HTMLDivElement;
  let root: Root;

  const render = async (colorTheme: MapColorTheme, lighting: MapLighting = "day") => {
    await act(async () => {
      root.render(<MapAppearanceConfig lighting={lighting} colorTheme={colorTheme} />);
    });
  };

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.clearAllMocks();
    window.localStorage.removeItem("shinigacim.mapLighting");
    window.localStorage.removeItem("shinigacim.mapColorTheme");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("defaults to dusk lighting and the default color theme", async () => {
    await act(async () => {
      root.render(<MapAppearanceDefaults />);
    });

    expect(container.querySelector("[data-appearance]")?.textContent).toBe("dusk:default");
  });

  it("builds the default Mapbox theme config with dusk lighting", () => {
    expect(getMapAppearanceConfig("dusk", "default")).toEqual({
      lightPreset: "dusk",
      theme: "default",
    });
  });

  it.each([
    ["default", "default"],
    ["faded", "faded"],
    ["mono", "monochrome"],
  ] as const)("applies the %s theme without invalid color values", async (colorTheme, mapTheme) => {
    await render(colorTheme);

    expect(map.setConfig).toHaveBeenCalledExactlyOnceWith("basemap", {
      lightPreset: "day",
      theme: mapTheme,
    });
  });

  it("applies custom colors while keeping the Standard config complete", async () => {
    await render("ocean");

    expect(map.setConfig).toHaveBeenCalledExactlyOnceWith("basemap", {
      lightPreset: "day",
      theme: "default",
      colorWater: "#a9dce6",
      colorLand: "#e7f2ef",
      colorGreenspace: "#b8d7c4",
      colorBuildings: "#d7e5e5",
      colorCommercial: "#d6e8e9",
      colorEducation: "#d3e6ee",
      colorMedical: "#edd9d6",
      colorIndustrial: "#d8e2e4",
      colorAdminBoundaries: "#7fb2bd",
      colorRoads: "#ffffff",
      colorTrunks: "#f5fcfc",
      colorMotorways: "#e5f4f6",
    });
  });

  it("applies dusk and the default color theme to Mapbox", async () => {
    await render("default", "dusk");

    expect(map.setConfig).toHaveBeenCalledExactlyOnceWith("basemap", {
      lightPreset: "dusk",
      theme: "default",
    });
  });
});
