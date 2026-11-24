// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { MapLoadingOverlay } from "../../../../../../src/features/locations/components/MapLoadingOverlay";
import { MobileMapLoadingOverlay } from "../../../../../../apps/mobile/src/places/MobileMapLoadingOverlay";
import { useAnimationStore } from "../../../../../../src/store/animationStore";

vi.mock("../../../../../../src/hooks/useMediaQuery", () => ({ useMediaQuery: () => true }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each([["web", MapLoadingOverlay], ["mobile", MobileMapLoadingOverlay]] as const)("%s map overlay respects timing with reduced motion and on a fast retry", async (_, Overlay) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  const previous = useAnimationStore.getState().enabled;
  useAnimationStore.setState({ enabled: true });
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<Overlay ready={false} className="map-overlay" />));
  expect(container.querySelector(".map-overlay")).toBeNull();
  act(() => { vi.advanceTimersByTime(200); });
  expect(container.querySelector(".map-overlay")).not.toBeNull();
  await act(async () => root.render(<Overlay ready className="map-overlay" />));
  act(() => { vi.advanceTimersByTime(399); });
  expect(container.querySelector(".map-overlay")).not.toBeNull();
  act(() => { vi.advanceTimersByTime(1); });
  expect(container.querySelector(".map-overlay")).toBeNull();
  await act(async () => root.render(<Overlay ready={false} className="map-overlay" />));
  act(() => { vi.advanceTimersByTime(199); });
  await act(async () => root.render(<Overlay ready className="map-overlay" />));
  act(() => { vi.advanceTimersByTime(1_000); });
  expect(container.querySelector(".map-overlay")).toBeNull();
  await act(async () => root.unmount());
  useAnimationStore.setState({ enabled: previous });
});
