import { useEffect, useState } from "react";
import { useMap } from "react-map-gl/mapbox";
import { motion } from "motion/react";
import {
  motionTokens,
  useShouldReduceMotion,
  useTempoTransition,
} from "@animate-ui/react/utils/motion";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { Moon } from "../../../components/animate-ui/icons/moon";
import { Sun } from "../../../components/animate-ui/icons/sun";
import { Sunrise } from "../../../components/animate-ui/icons/sunrise";
import { Sunset } from "../../../components/animate-ui/icons/sunset";
import { useLocale } from "../../../context/LocaleContext";

export type MapLighting = "dawn" | "day" | "dusk" | "night";
export type MapColorTheme = "default" | "faded" | "mono" | "ocean" | "warm" | "vivid";

const lightingOptions: readonly { value: MapLighting; label: string }[] = [
  { value: "dawn", label: "Dawn" },
  { value: "day", label: "Day" },
  { value: "dusk", label: "Dusk" },
  { value: "night", label: "Night" },
];

const colorThemeOptions: readonly { value: MapColorTheme; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "faded", label: "Faded" },
  { value: "mono", label: "Mono" },
  { value: "ocean", label: "Ocean" },
  { value: "warm", label: "Warm" },
  { value: "vivid", label: "Vivid" },
];

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

export function getMapAppearanceConfig(lighting: MapLighting, colorTheme: MapColorTheme) {
  const colors = customThemes[colorTheme];
  return {
    lightPreset: lighting,
    theme: colorTheme === "mono" ? "monochrome" : colors ? "default" : colorTheme,
    ...(colors ?? {}),
  };
}

export function MapAppearanceConfig({
  lighting,
  colorTheme,
}: Pick<ReturnType<typeof useMapAppearance>, "lighting" | "colorTheme">) {
  const { current: mapRef } = useMap();

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const applyAppearance = () => {
      if (!map.isStyleLoaded() || map.getConfig("basemap") == null) return;

      map.setConfig("basemap", getMapAppearanceConfig(lighting, colorTheme));
    };

    map.on("style.load", applyAppearance);
    applyAppearance();
    return () => {
      map.off("style.load", applyAppearance);
    };
  }, [mapRef, lighting, colorTheme]);

  return null;
}

function LightingIcon({ value }: { value: MapLighting }) {
  if (value === "night") return <Moon size={18} aria-hidden="true" />;
  if (value === "day") return <Sun size={18} aria-hidden="true" />;

  return value === "dawn"
    ? <Sunrise size={18} aria-hidden="true" />
    : <Sunset size={18} aria-hidden="true" />;
}

export function MapAppearanceSettings({
  isOpen,
  lighting,
  colorTheme,
  selectLighting,
  selectColorTheme,
}: ReturnType<typeof useMapAppearance> & { isOpen: boolean }) {
  const { t } = useLocale();
  const shouldReduceMotion = useShouldReduceMotion();
  const transition = useTempoTransition(motionTokens.transition.reveal);

  return (
    <motion.div
      className="map-appearance"
      initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
      animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
      transition={shouldReduceMotion ? { duration: 0 } : transition}
      aria-hidden={!isOpen}
    >
      <section className="map-appearance__section" aria-labelledby="map-appearance-lighting">
        <h3 id="map-appearance-lighting" className="map-appearance__heading">{t("LIGHTING")}</h3>
        <div className="map-appearance__grid" role="group" aria-label={t("LIGHTING")}>
          {lightingOptions.map(({ value, label }) => (
            <AnimateIcon key={value} animateOnHover animateOnTap completeOnStop asChild>
              <button
                type="button"
                className="map-appearance__option"
                aria-label={t(label)}
                aria-pressed={lighting === value}
                onClick={() => selectLighting(value)}
              >
                {lighting === value && (
                  <motion.span
                    className="map-appearance__selection-indicator"
                    aria-hidden="true"
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={shouldReduceMotion ? { duration: 0 } : transition}
                  />
                )}
                <LightingIcon value={value} />
                <span>{t(label)}</span>
              </button>
            </AnimateIcon>
          ))}
        </div>
      </section>

      <section className="map-appearance__section" aria-labelledby="map-appearance-color-theme">
        <h3 id="map-appearance-color-theme" className="map-appearance__heading">{t("COLOR THEME")}</h3>
        <div className="map-appearance__grid map-appearance__grid--themes" role="group" aria-label={t("COLOR THEME")}>
          {colorThemeOptions.map(({ value, label }) => (
            <AnimateIcon key={value} animateOnHover animateOnTap completeOnStop asChild>
              <button
                type="button"
                className="map-appearance__option map-appearance__theme"
                data-theme={value}
                aria-label={t(label)}
                aria-pressed={colorTheme === value}
                onClick={() => selectColorTheme(value)}
              >
                {colorTheme === value && (
                  <motion.span
                    className="map-appearance__selection-indicator"
                    aria-hidden="true"
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={shouldReduceMotion ? { duration: 0 } : transition}
                  />
                )}
                <span className="map-appearance__swatches" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span>{t(label)}</span>
              </button>
            </AnimateIcon>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
