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
      matches: (query === "(max-width: 900px)" && narrowScreen) || (query === "(max-width: 640px)" && mobileScreen),
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

  it("keeps the animated spacer beside the fixed panel and page content", async () => {
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

  it("starts as an icon rail on narrow screens and can expand", async () => {
    narrowScreen = true;
    await renderLayout();
    expect(container.querySelector(".app-shell")?.getAttribute("data-state")).toBe("collapsed");
    await act(async () => container.querySelector<HTMLButtonElement>(".sidebar__toggle")!.click());
    expect(container.querySelector(".app-shell")?.getAttribute("data-state")).toBe("expanded");
  });

  it("shows Gallery and admin Trash in the collapsed rail", async () => {
    narrowScreen = true;
    useAuthStore.setState({
      user: { id: "admin", username: "Admin", role: "admin", status: "active", createdAt: "2026-01-01T00:00:00Z" },
    });
    await renderLayout();
    expect(container.querySelector<HTMLAnchorElement>('[aria-label="Gallery"]')?.getAttribute("href")).toBe("/library/gallery");
    expect(container.querySelector('[href="/library/gallery/trash"]')).not.toBeNull();
  });

  it("uses an off-canvas drawer with a top bar on phones", async () => {
    narrowScreen = true;
    mobileScreen = true;
    await renderLayout("/library/gallery");
    const shell = container.querySelector(".app-shell")!;
    expect(container.querySelector(".app-topbar .brand")).toBeNull();
    expect(shell.getAttribute("data-state")).toBe("collapsed");
    expect(container.querySelector(".sidebar-backdrop")).toBeNull();
    expect(container.querySelector(".sidebar")?.hasAttribute("inert")).toBe(true);

    await act(async () => container.querySelector<HTMLButtonElement>(".sidebar__toggle")!.click());
    expect(shell.getAttribute("data-state")).toBe("expanded");
    expect(document.body.style.overflow).toBe("hidden");
    expect(container.querySelector(".sidebar")?.hasAttribute("inert")).toBe(false);
    expect(container.querySelector(".app-shell__main")?.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(container.querySelector(".sidebar a"));

    await act(async () => container.querySelector<HTMLDivElement>(".sidebar-backdrop")!.click());
    expect(shell.getAttribute("data-state")).toBe("collapsed");
    expect(container.querySelector(".sidebar-backdrop")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(container.querySelector(".app-shell__main")?.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(container.querySelector(".sidebar__toggle"));

    await act(async () => container.querySelector<HTMLButtonElement>(".sidebar__toggle")!.click());
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(shell.getAttribute("data-state")).toBe("collapsed");
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

  it("wraps keyboard focus inside the open mobile navigation", async () => {
    narrowScreen = true;
    mobileScreen = true;
    const rect = new DOMRect(0, 0, 44, 44);
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue(
      Object.assign([rect], { item: (index: number) => index === 0 ? rect : null }),
    );
    await renderLayout();
    const toggle = container.querySelector<HTMLButtonElement>(".sidebar__toggle")!;
    const first = container.querySelector<HTMLAnchorElement>(".sidebar a")!;
    await act(async () => toggle.click());
    toggle.focus();

    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Tab", cancelable: true,
    })));
    expect(document.activeElement).toBe(first);

    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Tab", shiftKey: true, cancelable: true,
    })));
    expect(document.activeElement).toBe(toggle);
  });

  it("reserves a shared header above page content on wider screens", async () => {
    await renderLayout();
    const header = container.querySelector(".app-topbar");
    expect(header).not.toBeNull();
    expect(header?.querySelector(".brand")).toBeNull();
    expect(header?.querySelector(".notification-bar")).not.toBeNull();
    expect(header?.nextElementSibling).toBe(container.querySelector(".app-shell__content"));
  });

  it("keeps mobile drawer sections expanded when opening and closing", async () => {
    narrowScreen = true;
    mobileScreen = true;
    await renderLayout();
    const sync = container.querySelector<HTMLButtonElement>('[aria-label="Sync"]')!;
    expect(sync.getAttribute("aria-expanded")).toBe("true");

    await act(async () => container.querySelector<HTMLButtonElement>(".sidebar__toggle")!.click());
    expect(sync.getAttribute("aria-expanded")).toBe("true");
    await act(async () => container.querySelector<HTMLButtonElement>(".sidebar__toggle")!.click());
    expect(sync.getAttribute("aria-expanded")).toBe("true");
  });

  it("shows the brand on non-home pages and keeps controls inside the mobile header", async () => {
    narrowScreen = true;
    mobileScreen = true;
    await renderLayout("/library/album");
    const header = container.querySelector(".app-topbar");
    expect(header?.querySelector(".brand")).not.toBeNull();
    expect(header?.querySelector(".notification-bar")).not.toBeNull();
    expect(header?.querySelector(".notification-bar .theme-toggler")).not.toBeNull();
    expect(container.querySelector(".sidebar .theme-toggler")).toBeNull();
    expect(header?.nextElementSibling).toBe(container.querySelector(".app-shell__content"));
  });

  it("keeps theme, language, and notification controls inside the mobile header on home", async () => {
    narrowScreen = true;
    mobileScreen = true;
    await renderLayout();
    const header = container.querySelector(".app-topbar");
    expect(header?.querySelector(".brand")).toBeNull();
    expect(header?.querySelector(".notification-bar")).not.toBeNull();
    expect(header?.querySelector(".notification-bar .theme-toggler")).not.toBeNull();
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

  it("places the theme toggle beside language and notifications and persists the selected theme", async () => {
    await renderLayout();
    const bar = container.querySelector<HTMLElement>(".notification-bar")!;
    const themeButton = bar.querySelector<HTMLButtonElement>(".theme-toggler")!;
    expect(Array.from(bar.querySelectorAll("button"))).toEqual([
      themeButton,
      bar.querySelector(".language-toggler"),
      bar.querySelector(".notification-bar__trigger"),
    ]);
    expect(container.querySelectorAll(".theme-toggler")).toHaveLength(1);
    expect(container.querySelector(".sidebar .theme-toggler")).toBeNull();
    expect(themeButton.dataset.theme).toBe("dark");

    await act(async () => themeButton.click());

    expect(themeButton.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem("shinigacim.theme")).toBe("light");
  });
});
