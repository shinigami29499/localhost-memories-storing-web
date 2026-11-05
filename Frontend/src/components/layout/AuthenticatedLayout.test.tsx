// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../context/ThemeContext";
import { LocaleProvider } from "../../context/LocaleContext";
import { useAuthStore } from "../../store/authStore";
import { AuthenticatedLayout } from "./AuthenticatedLayout";

vi.mock("../../features/uploads/components/UploadRuntime", () => ({
  UploadRuntime: () => null,
}));

describe("AuthenticatedLayout sidebar", () => {
  let container: HTMLDivElement;
  let root: Root;
  let narrowScreen: boolean;
  let mobileScreen: boolean;
  const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");

  beforeEach(() => {
    narrowScreen = false;
    mobileScreen = false;
    window.localStorage.removeItem("shinigacim.theme");
    window.localStorage.removeItem("shinigacim.language");
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: (query === "(max-width: 1199px)" && narrowScreen)
        || (query === "(min-width: 768px) and (max-width: 1199px)" && narrowScreen && !mobileScreen)
        || (query === "(max-width: 767px)" && mobileScreen),
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
    window.localStorage.removeItem("shinigacim.theme");
    window.localStorage.removeItem("shinigacim.language");
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("lang");
    if (originalAnimate) Object.defineProperty(Element.prototype, "animate", originalAnimate);
    else Reflect.deleteProperty(Element.prototype, "animate");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function renderLayout(initialPath = "/") {
    await act(async () => {
      root.render(
        <ThemeProvider>
          <LocaleProvider>
            <QueryClientProvider client={new QueryClient()}>
              <AnimateUIProvider reducedMotion="always">
                <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AuthenticatedLayout />
                </MemoryRouter>
              </AnimateUIProvider>
            </QueryClientProvider>
          </LocaleProvider>
        </ThemeProvider>,
      );
    });
  }

  it("keeps the sidebar spacer beside the panel and page content", async () => {
    await renderLayout();
    const shell = container.querySelector(".app-shell");
    expect(container.querySelector(".sidebar-gap")?.parentElement).toBe(shell);
    expect(container.querySelector(".sidebar")?.parentElement).toBe(shell);
    expect(container.querySelector(".sidebar__toggle")?.parentElement).toBe(shell);
    expect(container.querySelector(".app-shell__main")?.parentElement).toBe(shell);
    expect(shell?.getAttribute("data-state")).toBe("expanded");

    await act(async () => container.querySelector<HTMLButtonElement>(".sidebar__toggle")!.click());
    expect(shell?.getAttribute("data-collapsible")).toBe("icon");
    expect(container.querySelector(".sidebar__toggle")?.getAttribute("aria-label")).toBe("Expand navigation");
    expect(container.querySelector(".sidebar__nav a")?.getAttribute("aria-label")).toBe("Home");

    await act(async () => container.querySelector<HTMLButtonElement>(".sidebar__toggle")!.click());
    expect(shell?.getAttribute("data-state")).toBe("expanded");
  });

  it("uses an icon rail at intermediate widths", async () => {
    narrowScreen = true;
    await renderLayout();
    expect(container.querySelector(".app-shell")?.getAttribute("data-state")).toBe("collapsed");
    await act(async () => container.querySelector<HTMLButtonElement>(".sidebar__toggle")!.click());
    expect(container.querySelector(".app-shell")?.getAttribute("data-state")).toBe("collapsed");
  });

  it("shows Gallery in the collapsed rail", async () => {
    narrowScreen = true;
    useAuthStore.setState({
      user: { id: "admin", username: "Admin", role: "admin", status: "active", createdAt: "2026-01-01T00:00:00Z" },
    });
    await renderLayout();
    expect(container.querySelector<HTMLAnchorElement>('[aria-label="Gallery"]')?.getAttribute("href")).toBe("/gallery");
  });

  it("uses bottom navigation with a top bar on phones", async () => {
    narrowScreen = true;
    mobileScreen = true;
    await renderLayout("/gallery");
    expect(container.querySelector(".sidebar")).toBeNull();
    expect(container.querySelector(".sidebar__toggle")).toBeNull();
    expect(container.querySelectorAll(".bottom-navigation a")).toHaveLength(4);
    expect(container.querySelector(".app-topbar")?.textContent).toContain("Gallery");
  });

  it("provides a localized keyboard shortcut to the routed content", async () => {
    await renderLayout();
    const skip = container.querySelector<HTMLAnchorElement>(".skip-link")!;
    expect(skip.textContent).toBe("Skip to content");
    expect(skip.getAttribute("href")).toBe("#main-content");
    expect(container.querySelector("#main-content")?.getAttribute("tabindex")).toBe("-1");
    await act(async () => container.querySelector<HTMLButtonElement>(".language-toggler")!.click());
    expect(skip.textContent).toBe("Chuyển đến nội dung");
  });

  it("keeps mobile destinations keyboard accessible", async () => {
    narrowScreen = true;
    mobileScreen = true;
    await renderLayout();
    const first = container.querySelector<HTMLAnchorElement>(".bottom-navigation a")!;
    first.focus();
    expect(document.activeElement).toBe(first);
    expect(container.querySelector<HTMLButtonElement>(".bottom-navigation button")?.getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("reserves a shared header above page content on wider screens", async () => {
    await renderLayout();
    const header = container.querySelector(".app-topbar");
    expect(header).not.toBeNull();
    expect(header?.querySelector(".brand")).toBeNull();
    expect(header?.querySelector(".notification-bar")).not.toBeNull();
    expect(header?.nextElementSibling).toBe(container.querySelector(".app-shell__content"));
  });

  it("replaces the upload destination with users on mobile", async () => {
    narrowScreen = true;
    mobileScreen = true;
    await renderLayout();
    expect(container.querySelector('.bottom-navigation a[href="/users"]')).not.toBeNull();
    expect(container.querySelector('.bottom-navigation a[href="/uploads"]')).toBeNull();
    expect(container.querySelector(".bottom-navigation button")?.textContent).toContain("More");
  });

  it("shows the page title and notifications in the mobile header", async () => {
    narrowScreen = true;
    mobileScreen = true;
    await renderLayout("/gallery/album");
    const header = container.querySelector(".app-topbar");
    expect(header?.textContent).toContain("Album");
    expect(header?.querySelector(".notification-bar")).not.toBeNull();
    expect(header?.querySelector(".notification-bar .theme-toggler")).toBeNull();
    expect(container.querySelector(".sidebar .theme-toggler")).toBeNull();
    expect(header?.nextElementSibling).toBe(container.querySelector(".app-shell__content"));
  });

  it("keeps language and notification controls inside the mobile header on home", async () => {
    narrowScreen = true;
    mobileScreen = true;
    await renderLayout();
    const header = container.querySelector(".app-topbar");
    expect(header?.querySelector(".brand")).toBeNull();
    expect(header?.querySelector(".notification-bar")).not.toBeNull();
    expect(header?.querySelector(".notification-bar .theme-toggler")).toBeNull();
    expect(header?.querySelector(".language-toggler")).not.toBeNull();
    expect(container.querySelector(".sidebar .theme-toggler")).toBeNull();
    expect(header?.nextElementSibling).toBe(container.querySelector(".app-shell__content"));
  });

  it("shows a top-right notification bell with an accessible empty state", async () => {
    await renderLayout();
    const bar = container.querySelector<HTMLElement>(".notification-bar")!;
    const trigger = bar.querySelector<HTMLButtonElement>(".notification-bar__trigger")!;

    expect(bar).not.toBeNull();
    expect(bar.classList.contains("notification-bar")).toBe(true);
    expect(trigger.getAttribute("aria-label")).toBe("Notifications");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    await act(async () => trigger.click());

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(bar.querySelector(".notification-bar__panel")?.textContent).toContain(
      "Notifications will appear here when available.",
    );

    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("places a language toggle beside the bell and persists English and Vietnamese", async () => {
    await renderLayout();
    const bar = container.querySelector<HTMLElement>(".notification-bar")!;
    const languageButton = bar.querySelector<HTMLButtonElement>(".language-toggler")!;
    const notificationButton = bar.querySelector<HTMLButtonElement>(".notification-bar__trigger")!;

    expect(languageButton.nextElementSibling).toBe(notificationButton);
    expect(languageButton.getAttribute("aria-label")).toBe("Switch language to Vietnamese");
    expect(languageButton.querySelector("svg")).not.toBeNull();

    await act(async () => languageButton.click());

    expect(document.documentElement.lang).toBe("vi");
    expect(window.localStorage.getItem("shinigacim.language")).toBe("vi");
    expect(container.querySelector(".sidebar__nav a")?.textContent).toContain("Trang chủ");
    expect(languageButton.getAttribute("aria-label")).toBe("Chuyển ngôn ngữ sang Tiếng Anh");

    await act(async () => languageButton.click());

    expect(document.documentElement.lang).toBe("en");
    expect(window.localStorage.getItem("shinigacim.language")).toBe("en");
    expect(container.querySelector(".sidebar__nav a")?.textContent).toContain("Home");
  });

  it("uses one theme without exposing a theme toggle", async () => {
    window.localStorage.setItem("shinigacim.theme", "dark");
    await renderLayout();
    const bar = container.querySelector<HTMLElement>(".notification-bar")!;
    expect(Array.from(bar.querySelectorAll("button"))).toEqual([
      bar.querySelector(".language-toggler"),
      bar.querySelector(".notification-bar__trigger"),
    ]);
    expect(container.querySelectorAll(".theme-toggler")).toHaveLength(0);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem("shinigacim.theme")).toBe("dark");
  });
});
