// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsersPage } from "../../../../../src/pages/users/UsersPage";
import { useAuthStore } from "../../../../../src/store/authStore";
import { userService } from "../../../../../src/features/users/services/userService";
import type { AuthUser } from "../../../../../src/features/auth";

vi.mock("../../../../../src/features/users/services/userService", () => ({ userService: { page: vi.fn(), list: vi.fn() } }));
const users: AuthUser[] = Array.from({ length: 35 }, (_, index) => ({
  id: `user-${index}`, username: `member-${index}`, role: "user",
  status: index % 2 ? "pending_approval" : "active", createdAt: "2026-10-24T00:00:00Z",
}));

describe("UsersPage", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  const names = () => Array.from(container.querySelectorAll(".admin-users__username"), (node) => node.textContent);
  async function renderPage() {
    await act(async () => root.render(<MemoryRouter><QueryClientProvider client={client}><UsersPage /></QueryClientProvider></MemoryRouter>));
    await vi.waitFor(() => expect(names()).toHaveLength(30));
  }
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("matchMedia", vi.fn((media: string) => ({ matches: false, media, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
    vi.mocked(userService.page).mockImplementation(async (page, limit, pendingOnly) => {
      const filtered = users.filter((user) => !pendingOnly || user.status === "pending_approval");
      return { items: filtered.slice((page - 1) * limit, page * limit), page, limit, total: filtered.length };
    });
    vi.mocked(userService.list).mockResolvedValue(users);
    useAuthStore.setState({ user: { id: "viewer", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" } });
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount()); client.clear(); container.remove(); useAuthStore.getState().clear(); vi.unstubAllGlobals(); vi.clearAllMocks();
  });

  it("loads the first server page and retains management controls for administrators", async () => {
    await renderPage();
    expect(userService.page).toHaveBeenCalledWith(1, 30, false, expect.any(AbortSignal), false);
    expect(names()).toEqual(users.slice(0, 30).map((user) => user.username));
    expect(container.querySelector('[aria-label="Approve member-1"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Delete member-0"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Next page"]')).toBeNull();
  });

  it("filters the full directory when searching and displays an empty state", async () => {
    await renderPage();
    const input = container.querySelector<HTMLInputElement>('[aria-label="Search users"]')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => { setter.call(input, "member-34"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    await vi.waitFor(() => expect(names()).toEqual(["member-34"]));
    expect(userService.list).toHaveBeenCalled();
    await act(async () => { setter.call(input, "not-found"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    await vi.waitFor(() => expect(container.textContent).toContain("No matching users"));
  });

  it("does not expose moderation actions or blocked tab to members", async () => {
    useAuthStore.setState({ user: { id: "reader", username: "reader", role: "user", status: "active", createdAt: "2026-01-01" } });
    await renderPage();
    expect(container.querySelector('[aria-label="Approve member-1"]')).toBeNull();
    expect(container.querySelector('[aria-label="Delete member-0"]')).toBeNull();
    expect(container.textContent).not.toContain("Blocked");
  });
});
