// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMapBounds } from "./useMapBounds";

function Harness() {
  const { bounds, update } = useMapBounds();
  return <><output>{bounds.west}</output><button onClick={() => update({ west: 10, south: 0, east: 20, north: 10 })}>Move</button></>;
}

describe("map bounds", () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("waits for movement to settle before updating the query bounds", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<Harness />));
      await act(async () => container.querySelector("button")!.click());
      await act(async () => vi.advanceTimersByTime(199));
      expect(container.querySelector("output")?.textContent).toBe("-180");
      await act(async () => vi.advanceTimersByTime(1));
      expect(container.querySelector("output")?.textContent).toBe("10");
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
