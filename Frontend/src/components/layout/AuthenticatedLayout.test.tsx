// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../store/authStore";
import { AuthenticatedLayout } from "./AuthenticatedLayout";

describe("AuthenticatedLayout sidebar", () => {
  let container: HTMLDivElement;
  let root: Root;
  let narrowScreen: boolean;
  const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");

  beforeEach(() => {
    narrowScreen = false;
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: query === "(max-width: 900px)" && narrowScreen,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })));
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() })),
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useAuthStore.getState().clear();
    if (originalAnimate) Object.defineProperty(Element.prototype, "animate", originalAnimate);
    else Reflect.deleteProperty(Element.prototype, "animate");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function renderLayout() {
    await act(async () => {
      root.render(
        <AnimateUIProvider reducedMotion="always">
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthenticatedLayout />
          </MemoryRouter>
        </AnimateUIProvider>,
      );
    });
  }

  it("keeps the animated spacer beside the fixed panel and page content", async () => {
    await renderLayout();
    const shell = container.querySelector(".app-shell");
    expect(container.querySelector(".sidebar-gap")?.parentElement).toBe(shell);
    expect(container.querySelector(".sidebar")?.parentElement).toBe(shell);
    expect(container.querySelector(".app-shell__main")?.parentElement).toBe(shell);
    expect(shell?.getAttribute("data-state")).toBe("expanded");

    await act(async () => container.querySelector<HTMLButtonElement>(".sidebar__toggle")!.click());
    expect(shell?.getAttribute("data-collapsible")).toBe("icon");
    expect(container.querySelector(".sidebar__toggle")?.getAttribute("aria-label")).toBe("Expand navigation");
    expect(container.querySelector(".sidebar__nav a")?.getAttribute("aria-label")).toBe("Feed");

    await act(async () => container.querySelector<HTMLButtonElement>(".sidebar__toggle")!.click());
    expect(shell?.getAttribute("data-state")).toBe("expanded");
  });

  it("starts as an icon rail on narrow screens and can expand", async () => {
    narrowScreen = true;
    await renderLayout();
    expect(container.querySelector(".app-shell")?.getAttribute("data-state")).toBe("collapsed");
    await act(async () => container.querySelector<HTMLButtonElement>(".sidebar__toggle")!.click());
    expect(container.querySelector(".app-shell")?.getAttribute("data-state")).toBe("expanded");
  });

  it("opens the Admin section from the collapsed rail", async () => {
    narrowScreen = true;
    useAuthStore.setState({
      user: { id: "admin", username: "Admin", role: "admin", status: "active", createdAt: "2026-01-01T00:00:00Z" },
    });
    await renderLayout();
    const admin = container.querySelector<HTMLButtonElement>('[aria-label="Admin"]')!;
    expect(admin.getAttribute("aria-expanded")).toBe("false");
    await act(async () => admin.click());
    expect(container.querySelector(".app-shell")?.getAttribute("data-state")).toBe("expanded");
    expect(admin.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[href="/admin/users"]')).not.toBeNull();
  });
});
