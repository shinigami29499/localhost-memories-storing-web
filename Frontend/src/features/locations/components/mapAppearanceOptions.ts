export type MapLighting = "dawn" | "day" | "dusk" | "night";
export type MapColorTheme = "default" | "faded" | "mono" | "ocean" | "warm" | "vivid";

export const lightingOptions: readonly { value: MapLighting; label: string }[] = [
  { value: "dawn", label: "Dawn" },
  { value: "day", label: "Day" },
  { value: "dusk", label: "Dusk" },
  { value: "night", label: "Night" },
];

export const colorThemeOptions: readonly { value: MapColorTheme; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "faded", label: "Faded" },
  { value: "mono", label: "Mono" },
  { value: "ocean", label: "Ocean" },
  { value: "warm", label: "Warm" },
  { value: "vivid", label: "Vivid" },
];

