// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TopographyBackground } from "./topography";

vi.mock("motion/react", () => ({ useInView: () => true }));

describe("TopographyBackground animation", () => {
  let container: HTMLDivElement;
  let root: Root;
  let frame: FrameRequestCallback | undefined;
  let reducedMotion: boolean;
  const clearRect = vi.fn();
  const stroke = vi.fn();
  const cancelFrame = vi.fn();
  const context = {
    setTransform: vi.fn(),
    clearRect,
    stroke,
    strokeStyle: "",
    globalAlpha: 1,
    lineWidth: 1,
  };

  beforeEach(() => {
    reducedMotion = false;
    frame = undefined;
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", () => ({
      matches: reducedMotion,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    });
    vi.stubGlobal("Path2D", class {
      moveTo() {}
      lineTo() {}
    });
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", cancelFrame);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as CanvasRenderingContext2D);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 320, bottom: 240,
      width: 320, height: 240, toJSON: () => ({}),
    });
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  function render() {
    act(() => root.render(<TopographyBackground />));
  }

  it.each([60, 120])("draws every animation frame at %i Hz without a 30 FPS throttle", (refreshRate) => {
    render();
    const strokesPerFrame = stroke.mock.calls.length;
    clearRect.mockClear();
    stroke.mockClear();
    const start = performance.now();

    for (let i = 1; i <= 12; i++) {
      act(() => frame?.(start + i * 1000 / refreshRate));
    }

    expect(clearRect).toHaveBeenCalledTimes(12);
    expect(stroke).toHaveBeenCalledTimes(12 * strokesPerFrame);
  });

  it("draws a static map without scheduling frames under reduced motion", () => {
    reducedMotion = true;
    render();

    expect(clearRect).toHaveBeenCalledOnce();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event("pointermove")));
    expect(clearRect).toHaveBeenCalledOnce();
  });

  it("cancels the loop when the page becomes hidden and resumes when visible", () => {
    render();
    vi.mocked(requestAnimationFrame).mockClear();
    cancelFrame.mockClear();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(cancelFrame).toHaveBeenCalledWith(1);
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
  });
});
