// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../store/authStore";
import { AuthenticatedLayout } from "./AuthenticatedLayout";

vi.mock("../animate-ui/icons/home", async () => {
  const { useAnimateIconContext } = await import("@animate-ui/react/icons");
  return { Home: () => <svg data-animated={String(useAnimateIconContext().active === true)} /> };
});

vi.mock("../animate-ui/icons/users", async () => {
  const { useAnimateIconContext } = await import("@animate-ui/react/icons");
  return { Users: () => <svg data-animated={String(useAnimateIconContext().active === true)} /> };
});

vi.mock("../animate-ui/icons/file-text", async () => {
  const { useAnimateIconContext } = await import("@animate-ui/react/icons");
  return { FileText: () => <svg data-animated={String(useAnimateIconContext().active === true)} /> };
});

describe("Sidebar icon hover triggers", () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("scrollTo", vi.fn());
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false,
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
    useAuthStore.setState({
      user: { id: "admin", username: "Admin", role: "admin", status: "active", createdAt: "2026-01-01T00:00:00Z" },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <AnimateUIProvider reducedMotion="never">
          <MemoryRouter initialEntries={["/admin/users"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthenticatedLayout />
          </MemoryRouter>
        </AnimateUIProvider>,
      );
    });
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

  it.each(["/", "/admin/users", "/admin/posts"])("animates the icon when hovering the %s link text", async (href) => {
    const link = container.querySelector<HTMLAnchorElement>(`.sidebar__nav a[href="${href}"]`)!;
    const label = link.querySelector("span")!;
    expect(link.classList.contains("sidebar__link")).toBe(true);
    expect(link.classList.contains("sidebar__sub-link")).toBe(href !== "/");
    expect(link.classList.contains("sidebar__link--active")).toBe(href === "/admin/users");
    expect(link.getAttribute("aria-current")).toBe(href === "/admin/users" ? "page" : null);
    expect(link.querySelector("svg")?.getAttribute("data-animated")).toBe("false");

    await act(async () => label.dispatchEvent(new MouseEvent("pointerover", { bubbles: true })));
    expect(link.querySelector("svg")?.getAttribute("data-animated")).toBe("true");

    await act(async () => label.dispatchEvent(new MouseEvent("pointerout", { bubbles: true, relatedTarget: document.body })));
    expect(link.querySelector("svg")?.getAttribute("data-animated")).toBe("false");
  });
});
