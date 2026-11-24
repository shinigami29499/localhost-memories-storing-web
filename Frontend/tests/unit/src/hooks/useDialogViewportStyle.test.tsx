// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { useDialogViewportStyle } from "../../../../src/hooks/useDialogViewportStyle";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it("debounces resize measurements and cancels a pending update on unmount", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let resize = () => {};
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resize = callback; }
    observe() {}
    disconnect() {}
  });
  const main = document.createElement("div");
  main.className = "app-shell__main";
  let width = 300;
  main.getBoundingClientRect = () => ({ left: 10, width } as DOMRect);
  document.body.append(main);
  const container = document.createElement("div");
  const root = createRoot(container);
  function Dialog() {
    const style = useDialogViewportStyle();
    return <div style={style} />;
  }

  await act(async () => root.render(<Dialog />));
  expect(container.firstElementChild?.getAttribute("style")).toContain("width: 300px");
  await act(async () => {
    width = 400;
    resize();
    vi.advanceTimersByTime(199);
  });
  expect(container.firstElementChild?.getAttribute("style")).toContain("width: 300px");
  await act(async () => vi.advanceTimersByTime(1));
  expect(container.firstElementChild?.getAttribute("style")).toContain("width: 400px");
  await act(async () => {
    width = 500;
    resize();
    root.unmount();
    vi.advanceTimersByTime(200);
  });
  expect(vi.getTimerCount()).toBe(0);
});
