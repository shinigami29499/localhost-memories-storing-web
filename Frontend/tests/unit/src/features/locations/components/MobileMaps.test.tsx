// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { MobileLocationMap } from "../../../../../../apps/mobile/src/places/MobileLocationMap";
import { MobilePlaceMap } from "../../../../../../apps/mobile/src/places/MobilePlaceMap";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const maps = [
  ["travel", <MobileLocationMap {...({ media: [], selected: undefined } as unknown as Parameters<typeof MobileLocationMap>[0])} />],
  ["places", <MobilePlaceMap {...({ places: [], selectedId: null } as unknown as Parameters<typeof MobilePlaceMap>[0])} />],
] as const;

it.each(maps)("%s map explains a missing public token", async (_, element) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "");
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(element));
  expect(container.querySelector('[role="status"]')?.textContent).toContain("VITE_MAPBOX_ACCESS_TOKEN");
  await act(async () => root.unmount());
});
