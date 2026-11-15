// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { MapAppearanceSettings } from "../../../../../../src/features/locations/components/MapAppearanceSettings";
import { MobileMapAppearanceSettings } from "../../../../../../apps/mobile/src/places/MobileMapAppearanceSettings";

afterEach(() => vi.unstubAllGlobals());

it.each([["web", MapAppearanceSettings], ["mobile", MobileMapAppearanceSettings]] as const)("%s appearance controls expose and update selected options", async (_, Settings) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const selectLighting = vi.fn();
  const selectColorTheme = vi.fn();
  await act(async () => root.render(<Settings isOpen lighting="dusk" colorTheme="default" selectLighting={selectLighting} selectColorTheme={selectColorTheme} />));
  expect(container.querySelector<HTMLButtonElement>('[aria-label="Dusk"]')?.getAttribute("aria-pressed")).toBe("true");
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Night"]')!.click());
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Ocean"]')!.click());
  expect(selectLighting).toHaveBeenCalledExactlyOnceWith("night");
  expect(selectColorTheme).toHaveBeenCalledExactlyOnceWith("ocean");
  await act(async () => root.unmount());
  container.remove();
});
