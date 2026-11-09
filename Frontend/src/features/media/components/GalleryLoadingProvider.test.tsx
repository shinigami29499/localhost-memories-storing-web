// @vitest-environment jsdom
import { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GalleryLoadingProvider, useGalleryLoadingAllowed } from "./GalleryLoadingProvider";

function Probe() {
  const allowed = useGalleryLoadingAllowed();
  return <output>{allowed ? "idle" : "scrolling"}</output>;
}

function Gallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  return <div ref={containerRef}>
    <GalleryLoadingProvider containerRef={containerRef}>
      <div data-row><Probe /></div>
    </GalleryLoadingProvider>
  </div>;
}

describe("GalleryLoadingProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("batches nested scroll activity and cancels pending work on unmount", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<Gallery />));
      expect(container.textContent).toBe("idle");
      await act(async () => container.querySelector("[data-row]")!.dispatchEvent(new Event("scroll")));
      expect(container.textContent).toBe("scrolling");
      await act(async () => vi.advanceTimersByTime(100));
      await act(async () => container.querySelector("[data-row]")!.dispatchEvent(new Event("scroll")));
      await act(async () => vi.advanceTimersByTime(139));
      expect(container.textContent).toBe("scrolling");
      await act(async () => vi.advanceTimersByTime(1));
      expect(container.textContent).toBe("idle");
      await act(async () => container.querySelector("[data-row]")!.dispatchEvent(new Event("scroll")));
    } finally {
      await act(async () => root.unmount());
    }
    expect(vi.getTimerCount()).toBe(0);
  });
});
