// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../context/ThemeContext";
import { ThemeTogglerButton } from "./ThemeTogglerButton";

describe("ThemeTogglerButton", () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
  const originalTransition = Object.getOwnPropertyDescriptor(document, "startViewTransition");

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal("matchMedia", vi.fn((media: string) => ({
      matches: false,
      media,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })));
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() })),
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: undefined,
    });
    localStorage.removeItem("shinigacim.theme");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.removeItem("shinigacim.theme");
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-transition");
    if (originalAnimate) Object.defineProperty(Element.prototype, "animate", originalAnimate);
    else Reflect.deleteProperty(Element.prototype, "animate");
    if (originalTransition) Object.defineProperty(document, "startViewTransition", originalTransition);
    else Reflect.deleteProperty(document, "startViewTransition");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function renderToggle(reducedMotion: "always" | "never" = "never") {
    await act(async () => {
      root.render(
        <ThemeProvider>
          <AnimateUIProvider reducedMotion={reducedMotion}>
            <ThemeTogglerButton />
          </AnimateUIProvider>
        </ThemeProvider>,
      );
    });
    return container.querySelector<HTMLButtonElement>("button")!;
  }

  it.each(["light", "dark"])("restores the saved %s theme and shows an accessible control", async (theme) => {
    localStorage.setItem("shinigacim.theme", theme);
    const button = await renderToggle();

    expect(button.getAttribute("aria-label")).toBe("Toggle theme");
    expect(button.getAttribute("aria-pressed")).toBe(String(theme === "dark"));
    expect(button.title).toBe(`Switch to ${theme === "dark" ? "light" : "dark"} theme`);
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(document.documentElement.classList.contains("dark")).toBe(theme === "dark");
    expect(document.documentElement.dataset.theme).toBe(theme);
  });

  it("switches both ways and persists without View Transitions", async () => {
    const button = await renderToggle();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    for (const theme of ["light", "dark"]) {
      await act(async () => button.click());
      expect(button.getAttribute("aria-pressed")).toBe(String(theme === "dark"));
      expect(document.documentElement.classList.contains("dark")).toBe(theme === "dark");
      expect(document.documentElement.dataset.theme).toBe(theme);
      expect(localStorage.getItem("shinigacim.theme")).toBe(theme);
    }
  });

  it("skips the page transition under reduced motion", async () => {
    const startTransition = vi.fn();
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: startTransition });
    const button = await renderToggle("always");

    await act(async () => button.click());

    expect(startTransition).not.toHaveBeenCalled();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("shinigacim.theme")).toBe("light");
  });

  it.each(["dark", "light"])("keeps the palette and saved theme consistent during a fade from %s", async (theme) => {
    localStorage.setItem("shinigacim.theme", theme);
    let finishTransition!: () => void;
    const finished = new Promise<void>((resolve) => { finishTransition = resolve; });
    const animate = vi.fn(() => ({ finished }));
    Object.defineProperty(document.documentElement, "animate", { configurable: true, value: animate });
    const startTransition = vi.fn((update: () => void) => {
      update();
      return { ready: Promise.resolve() };
    });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: startTransition });
    const button = await renderToggle();
    const nextTheme = theme === "dark" ? "light" : "dark";

    try {
      await act(async () => button.click());

      expect(startTransition).toHaveBeenCalledOnce();
      expect(document.documentElement.classList.contains("dark")).toBe(nextTheme === "dark");
      expect(localStorage.getItem("shinigacim.theme")).toBe(nextTheme);
      expect(button.disabled).toBe(true);
      expect(animate).toHaveBeenNthCalledWith(
        1,
        { opacity: [1, 0] },
        expect.objectContaining({ duration: 280, pseudoElement: "::view-transition-old(root)" }),
      );
      expect(animate).toHaveBeenNthCalledWith(
        2,
        { opacity: [0, 1] },
        expect.objectContaining({ duration: 280, pseudoElement: "::view-transition-new(root)" }),
      );

      await act(async () => button.click());
      expect(startTransition).toHaveBeenCalledOnce();
      await act(async () => { finishTransition(); await finished; });
      expect(button.disabled).toBe(false);
      expect(document.documentElement.hasAttribute("data-theme-transition")).toBe(false);
      expect(localStorage.getItem("shinigacim.theme")).toBe(nextTheme);
      expect(document.documentElement.dataset.theme).toBe(nextTheme);
    } finally {
      Reflect.deleteProperty(document.documentElement, "animate");
    }
  });

  it("applies the selected theme when the browser rejects a transition", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: vi.fn(() => ({ ready: Promise.reject(new DOMException("Transition aborted", "AbortError")) })),
    });
    const button = await renderToggle();
    await act(async () => button.click());

    expect(warning).toHaveBeenCalledOnce();
    expect(button.disabled).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("shinigacim.theme")).toBe("light");
    expect(document.documentElement.hasAttribute("data-theme-transition")).toBe(false);
  });
});
