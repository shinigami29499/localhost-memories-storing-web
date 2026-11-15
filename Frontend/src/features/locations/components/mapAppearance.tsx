import { useEffect, useState } from "react";
import { useMap } from "react-map-gl/mapbox";
import { lightingOptions, colorThemeOptions, type MapLighting, type MapColorTheme } from "./mapAppearanceOptions";

const colorProperties = [
  "colorWater",
  "colorLand",
  "colorGreenspace",
  "colorBuildings",
  "colorCommercial",
  "colorEducation",
  "colorMedical",
  "colorIndustrial",
  "colorAdminBoundaries",
  "colorRoads",
  "colorTrunks",
  "colorMotorways",
] as const;

const customThemes: Partial<Record<MapColorTheme, Record<(typeof colorProperties)[number], string>>> = {
  ocean: {
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
  },
  warm: {
    colorWater: "#ded2bd",
    colorLand: "#f0e5d3",
    colorGreenspace: "#c5cfae",
    colorBuildings: "#e2d6c3",
    colorCommercial: "#ead7bd",
    colorEducation: "#e2d9c6",
    colorMedical: "#ead2c8",
    colorIndustrial: "#ddd5c9",
    colorAdminBoundaries: "#b7a58d",
    colorRoads: "#fffaf2",
    colorTrunks: "#f8f0e3",
    colorMotorways: "#f2dfc5",
  },
  vivid: {
    colorWater: "#b7dff0",
    colorLand: "#f0ebdc",
    colorGreenspace: "#acd99e",
    colorBuildings: "#ded8ef",
    colorCommercial: "#f3d0bd",
    colorEducation: "#c8def2",
    colorMedical: "#f2c8c8",
    colorIndustrial: "#d6d7dc",
    colorAdminBoundaries: "#8676c7",
    colorRoads: "#ffffff",
    colorTrunks: "#fff6cf",
    colorMotorways: "#f4b77a",
  },
};

const lightingStorageKey = "shinigacim.mapLighting";
const colorThemeStorageKey = "shinigacim.mapColorTheme";

function readStoredValue<T extends string>(
  key: string,
  options: readonly { value: T }[],
  fallback: T,
): T {
  const stored = window.localStorage.getItem(key);
  return options.find((option) => option.value === stored)?.value ?? fallback;
}

export function useMapAppearance() {
  const [lighting, setLighting] = useState<MapLighting>(() =>
    typeof window === "undefined"
      ? "dusk"
      : readStoredValue(lightingStorageKey, lightingOptions, "dusk"),
  );
  const [colorTheme, setColorTheme] = useState<MapColorTheme>(() =>
    typeof window === "undefined"
      ? "default"
      : readStoredValue(colorThemeStorageKey, colorThemeOptions, "default"),
  );

  const selectLighting = (value: MapLighting) => {
    window.localStorage.setItem(lightingStorageKey, value);
    setLighting(value);
  };
  const selectColorTheme = (value: MapColorTheme) => {
    window.localStorage.setItem(colorThemeStorageKey, value);
    setColorTheme(value);
  };

  return { lighting, colorTheme, selectLighting, selectColorTheme };
}

export function getMapAppearanceConfig(lighting: MapLighting, colorTheme: MapColorTheme, show3dObjects = true) {
  const colors = customThemes[colorTheme];
  return {
    lightPreset: lighting,
    show3dObjects,
    theme: colorTheme === "mono" ? "monochrome" : colors ? "default" : colorTheme,
    ...(colors ?? {}),
  };
}

export function MapAppearanceConfig({
  lighting,
  colorTheme,
  show3dObjects,
}: Pick<ReturnType<typeof useMapAppearance>, "lighting" | "colorTheme"> & { show3dObjects: boolean }) {
  const { current: mapRef } = useMap();

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const applyAppearance = () => {
      if (!map.isStyleLoaded() || map.getConfig("basemap") == null) return;

      map.setConfig("basemap", getMapAppearanceConfig(lighting, colorTheme, show3dObjects));
    };

    map.on("style.load", applyAppearance);
    applyAppearance();
    return () => {
      map.off("style.load", applyAppearance);
    };
  }, [mapRef, lighting, colorTheme, show3dObjects]);

  return null;
}

