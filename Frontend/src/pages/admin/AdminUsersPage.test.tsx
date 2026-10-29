// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminUsersPage } from "./AdminUsersPage";
import type { AuthUser } from "../../features/auth";

vi.mock("../../features/users/services/userService", () => ({ userService: {} }));

const users: AuthUser[] = Array.from({ length: 25 }, (_, index) => ({
  id: `user-${index}`,
  username: `member-${index}`,
  role: "user",
  status: index % 2 === 0 ? "active" : "pending_approval",
  createdAt: "2026-10-24T00:00:00Z",
}));

describe("AdminUsersPage pagination", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;
  const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
  const originalGetAnimations = Object.getOwnPropertyDescriptor(Element.prototype, "getAnimations");

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
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
    Object.defineProperty(Element.prototype, "getAnimations", {
      configurable: true,
      value: vi.fn(() => []),
    });
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    queryClient.setQueryData(["admin-users"], users);
  });

  afterEach(() => {
    act(() => root.unmount());
    queryClient.clear();
    container.remove();
    window.localStorage.clear();
    if (originalAnimate) Object.defineProperty(Element.prototype, "animate", originalAnimate);
    else Reflect.deleteProperty(Element.prototype, "animate");
    if (originalGetAnimations) Object.defineProperty(Element.prototype, "getAnimations", originalGetAnimations);
    else Reflect.deleteProperty(Element.prototype, "getAnimations");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function renderPage() {
    act(() => root.render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <QueryClientProvider client={queryClient}>
          <AdminUsersPage />
        </QueryClientProvider>
      </MemoryRouter>,
    ));
  }

  function click(label: string) {
    act(() => container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click());
  }

  function displayedNames() {
    return Array.from(container.querySelectorAll(".admin-users__username"), (node) => node.textContent);
  }

  function search(value: string) {
    const input = container.querySelector<HTMLInputElement>('[aria-label="Search users"]')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  it("reuses the pagination footer outside scrolling content and keeps full account counts", () => {
    renderPage();
    const content = container.querySelector(".admin-users__content")!;
    const footer = container.querySelector(".admin-users__footer")!;
    expect(content.nextElementSibling).toBe(footer);
    expect(content.contains(footer)).toBe(false);
    expect(footer.querySelector('[aria-label="users pagination"]')).not.toBeNull();
    expect(displayedNames()).toEqual(users.slice(0, 10).map((user) => user.username));
    expect(Array.from(container.querySelectorAll(".admin-users__stat strong"), (node) => node.textContent))
      .toEqual(["25", "12", "13"]);
    click("Next page");
    expect(displayedNames()).toEqual(users.slice(10, 20).map((user) => user.username));
    click("Page 3");
    expect(displayedNames()).toEqual(users.slice(20).map((user) => user.username));
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')?.disabled).toBe(true);
    click("Previous page");
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("2");
  });

  it.each([20, 50])("restores the saved page size %i independently of other lists", (size) => {
    window.localStorage.setItem("admin-users.limit", String(size));
    window.localStorage.setItem("trash.limit", "10");
    renderPage();
    expect(displayedNames()).toHaveLength(Math.min(size, users.length));
    expect(container.querySelector('[aria-label="Items per page"]')?.textContent).toContain(String(size));
  });

  it.each(["100", "invalid"])("falls back to 10 for invalid saved size %s", (size) => {
    window.localStorage.setItem("admin-users.limit", size);
    renderPage();
    expect(displayedNames()).toHaveLength(10);
    expect(container.querySelector('[aria-label="Items per page"]')?.textContent).toContain("10");
  });

  it("saves page size changes and resets to page one", async () => {
    window.localStorage.setItem("trash.limit", "50");
    renderPage();
    click("Page 3");
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Items per page"]')!.click());
    const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
      .find((element) => element.textContent === "20")!;
    await act(async () => option.click());
    expect(displayedNames()).toHaveLength(20);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");
    expect(window.localStorage.getItem("admin-users.limit")).toBe("20");
    expect(window.localStorage.getItem("trash.limit")).toBe("50");
  });

  it("filters all users before paging and resets the page when status or search changes", () => {
    renderPage();
    click("Page 3");
    const activeTab = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
      .find((tab) => tab.textContent?.startsWith("Active"))!;
    act(() => activeTab.click());
    const activeUsers = users.filter((user) => user.status === "active");
    expect(displayedNames()).toEqual(activeUsers.slice(0, 10).map((user) => user.username));
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");
    click("Page 2");
    expect(displayedNames()).toEqual(activeUsers.slice(10).map((user) => user.username));
    search("member-24");
    expect(displayedNames()).toEqual(["member-24"]);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");
    search("no match");
    expect(container.querySelector(".empty-state")?.textContent).toContain("No matching users");
    expect(container.querySelectorAll('[data-slot="pagination-link"]')).toHaveLength(1);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')?.disabled).toBe(true);
  });

  it("clamps the current page when moderation updates shrink the results, including zero", async () => {
    renderPage();
    click("Page 3");
    await act(async () => {
      queryClient.setQueryData(["admin-users"], users.slice(0, 11));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("2");
    expect(displayedNames()).toEqual(["member-10"]);
    await act(async () => {
      queryClient.setQueryData(["admin-users"], []);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.querySelector(".empty-state")?.textContent).toContain("No members yet");
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Previous page"]')?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')?.disabled).toBe(true);
  });
});
