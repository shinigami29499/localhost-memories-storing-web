import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./global.css", import.meta.url), "utf8");
const token = (name: string) => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!match) throw new Error(`Missing color token: ${name}`);
  return match[1];
};
const luminance = (color: string) => {
  const channels = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
const contrast = (first: string, second: string) => {
  const values = [luminance(first), luminance(second)].sort((a, b) => a - b);
  return (values[1] + 0.05) / (values[0] + 0.05);
};

describe("shared palette", () => {
  it("keeps normal text and primary controls above 4.5:1 contrast", () => {
    for (const surface of ["bg", "surface", "surface-raised", "surface-hover"]) {
      expect(contrast(token("text"), token(surface)), surface).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(token("text-on-accent"), token("accent"))).toBeGreaterThanOrEqual(4.5);
  });
});
