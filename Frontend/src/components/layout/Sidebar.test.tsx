// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../context/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { AuthenticatedLayout } from "./AuthenticatedLayout";

vi.mock("../../features/uploads/components/UploadRuntime", () => ({
  UploadRuntime: () => null,
}));

vi.mock("../animate-ui/icons/home", async () => {
  const { useAnimateIconContext } = await import("@animate-ui/react/icons");
  return { Home: () => <svg data-animated={String(useAnimateIconContext().active === true)} /> };
});

vi.mock("../animate-ui/icons/image", async () => {
  const { useAnimateIconContext } = await import("@animate-ui/react/icons");
  return { Image: () => <svg data-animated={String(useAnimateIconContext().active === true)} /> };
});

vi.mock("../animate-ui/icons/refresh-cw", async () => {
  const { useAnimateIconContext } = await import("@animate-ui/react/icons");
  return { RefreshCw: () => <svg data-animated={String(useAnimateIconContext().active === true)} /> };
});

vi.mock("../animate-ui/icons/download", async () => {
  const { useAnimateIconContext } = await import("@animate-ui/react/icons");
  return { Download: () => <svg data-animated={String(useAnimateIconContext().active === true)} /> };
});

vi.mock("../animate-ui/icons/upload", async () => {
  const { useAnimateIconContext } = await import("@animate-ui/react/icons");
  return { Upload: () => <svg data-animated={String(useAnimateIconContext().active === true)} /> };
});

vi.mock("../animate-ui/icons/users", async () => {
  const { useAnimateIconContext } = await import("@animate-ui/react/icons");
  return { Users: () => <svg data-animated={String(useAnimateIconContext().active === true)} /> };
});

vi.mock("../animate-ui/icons/trash-2", async () => {
  const { useAnimateIconContext } = await import("@animate-ui/react/icons");
  return { Trash2: () => <svg data-animated={String(useAnimateIconContext().active === true)} /> };
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
        <ThemeProvider>
          <QueryClientProvider client={new QueryClient()}>
            <AnimateUIProvider reducedMotion="never">
              <MemoryRouter initialEntries={["/users"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AuthenticatedLayout />
              </MemoryRouter>
            </AnimateUIProvider>
          </QueryClientProvider>
        </ThemeProvider>,
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

  it.each(["/", "/gallery", "/gallery/trash", "/users"])("animates the icon when hovering the %s link text", async (href) => {
    const link = container.querySelector<HTMLAnchorElement>(`.sidebar__nav a[href="${href}"]`)!;
    const label = link.querySelector("span")!;
    expect(link.classList.contains("sidebar__link")).toBe(true);
    expect(link.classList.contains("sidebar__sub-link")).toBe(href.startsWith("/gallery"));
    expect(link.classList.contains("sidebar__link--active")).toBe(href === "/users");
    expect(link.getAttribute("aria-current")).toBe(href === "/users" ? "page" : null);
    expect(link.querySelector("svg")?.getAttribute("data-animated")).toBe("false");

    await act(async () => label.dispatchEvent(new MouseEvent("pointerover", { bubbles: true })));
    expect(link.querySelector("svg")?.getAttribute("data-animated")).toBe("true");

    await act(async () => label.dispatchEvent(new MouseEvent("pointerout", { bubbles: true, relatedTarget: document.body })));
    expect(link.querySelector("svg")?.getAttribute("data-animated")).toBe("false");
  });

  it("shows Gallery pages and Users to non-admin users without Trash", async () => {
    await act(async () => useAuthStore.setState({
      user: { id: "reader", username: "reader", role: "user", status: "active", createdAt: "2026-01-01T00:00:00Z" },
    }));
    const galleryPages = container.querySelector<HTMLElement>('[aria-label="Gallery pages"]')!;
    expect(Array.from(galleryPages.querySelectorAll("a"), (link) => link.getAttribute("href")))
      .toEqual(["/gallery", "/gallery/videos", "/gallery/favorites", "/saved"]);
    expect(container.querySelector('[href="/gallery"]')?.textContent).toBe("Pictures");
    expect(container.querySelector('[href="/saved"]')?.textContent).toBe("Saved");
    expect(container.querySelector('[href="/users"]')?.textContent).toBe("Users");
    expect(container.querySelector('[href="/gallery/trash"]')).toBeNull();
    expect(container.querySelector('[href^="/admin"]')).toBeNull();
  });

  it("keeps the upload watcher inside Sync beside the static Download action", async () => {
    const navigation = container.querySelector<HTMLElement>(".sidebar__nav")!;
    const groups = Array.from(navigation.children)
      .filter((child) => child.classList.contains("sidebar__group"))
      .map((group) => group.querySelector<HTMLButtonElement>(".sidebar__group-toggle")?.getAttribute("aria-label"));
    const sync = container.querySelector<HTMLButtonElement>('[aria-label="Sync"]')!;
    const syncActions = container.querySelector<HTMLElement>('[aria-label="Sync actions"]')!;
    const items = Array.from(syncActions.querySelectorAll<HTMLElement>(".sidebar__sub-link"));

    expect(groups).toEqual(["Gallery", "Sync"]);
    expect(sync.getAttribute("aria-expanded")).toBe("true");
    expect(sync.querySelector("svg")?.getAttribute("data-animated")).toBe("false");
    expect(items.map((item) => item.textContent?.trim())).toEqual(["Upload", "Download"]);
    expect(items.every((item) => item.classList.contains("sidebar__link"))).toBe(true);
    expect(items[0].classList.contains("sidebar__link--static")).toBe(false);
    expect(items[1].classList.contains("sidebar__link--static")).toBe(true);
    expect(items.map((item) => item.querySelector("svg")?.getAttribute("data-animated"))).toEqual(["false", "false"]);
    expect(container.querySelector('[href="/sync/download"]')).toBeNull();
    expect(syncActions.querySelector('[href="/uploads"]')?.textContent?.trim()).toBe("Upload");
    expect(container.querySelector('[href="/uploads/new"]')).toBeNull();
    expect(navigation.querySelector(':scope > a[href="/uploads"]')).toBeNull();

    for (const item of items) {
      const label = item.querySelector("span")!;
      await act(async () => label.dispatchEvent(new MouseEvent("pointerover", { bubbles: true })));
      expect(item.querySelector("svg")?.getAttribute("data-animated")).toBe("true");

      await act(async () => label.dispatchEvent(new MouseEvent("pointerout", { bubbles: true, relatedTarget: document.body })));
      expect(item.querySelector("svg")?.getAttribute("data-animated")).toBe("false");
    }

    await act(async () => sync.dispatchEvent(new MouseEvent("pointerover", { bubbles: true })));
    expect(sync.querySelector("svg")?.getAttribute("data-animated")).toBe("true");

    await act(async () => sync.dispatchEvent(new MouseEvent("pointerout", { bubbles: true, relatedTarget: document.body })));
    expect(sync.querySelector("svg")?.getAttribute("data-animated")).toBe("false");

    await act(async () => sync.click());

    expect(sync.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows the account name and role and closes its menu on outside click", async () => {
    const account = container.querySelector<HTMLElement>(".sidebar__account")!;
    const trigger = account.querySelector<HTMLButtonElement>(".sidebar__account-trigger")!;

    expect(trigger.querySelector(".sidebar__account-name")?.textContent).toBe("Admin");
    expect(trigger.querySelector(".sidebar__account-role")?.textContent).toBe("Admin");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(account.querySelector('[aria-label="Log out"]')).not.toBeNull();

    await act(async () => trigger.click());

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(account.querySelector(".sidebar__account-menu-user .sidebar__account-name")?.textContent).toBe("Admin");
    expect(account.querySelector(".sidebar__account-menu-user .sidebar__account-role")?.textContent).toBe("Admin");

    await act(async () => {
      document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

});
