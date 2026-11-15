// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../../../../src/store/authStore";
import { userService } from "../../../../../src/features/users/services/userService";
import type { AuthUser } from "../../../../../src/features/auth";
import { UsersPage } from "../../../../../src/pages/users/UsersPage";

vi.mock("../../../../../src/features/users/services/userService", () => ({ userService: { page: vi.fn() } }));
const users: AuthUser[] = Array.from({ length: 35 }, (_, index) => ({
  id: `user-${index}`, username: `member-${index}`, role: "user",
  status: index < 3 ? "pending_approval" : "active", createdAt: "2026-01-01T00:00:00Z",
}));

describe("user directory paging", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); window.localStorage.clear(); });

  it("loads the next server page on intersection and restarts for Pending", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    let intersect: IntersectionObserverCallback | undefined;
    vi.stubGlobal("IntersectionObserver", class { constructor(callback: IntersectionObserverCallback) { intersect = callback; } observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("matchMedia", vi.fn((media: string) => ({ matches: false, media, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
    useAuthStore.setState({ user: { id: "viewer", username: "viewer", role: "user", status: "active", createdAt: "2026-01-01T00:00:00Z" } });
    vi.mocked(userService.page).mockImplementation(async (page, limit, pendingOnly) => {
      const filtered = users.filter((user) => !pendingOnly || user.status === "pending_approval");
      return { items: filtered.slice((page - 1) * limit, page * limit), page, limit, total: filtered.length };
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const container = document.createElement("div"); document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<MemoryRouter initialEntries={["/users"]}><QueryClientProvider client={client}><UsersPage /></QueryClientProvider></MemoryRouter>));
      await vi.waitFor(() => { expect(container.textContent).toContain("member-29"); expect(intersect).toBeDefined(); });
      await act(async () => { intersect!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); });
      await vi.waitFor(() => expect(container.textContent).toContain("member-34"));
      expect(userService.page).toHaveBeenCalledWith(2, 30, false, expect.any(AbortSignal), false);
      const pending = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((tab) => tab.textContent?.startsWith("Pending"))!;
      await act(async () => pending.click());
      await vi.waitFor(() => expect(userService.page).toHaveBeenCalledWith(1, 30, true, expect.any(AbortSignal), false));
      await vi.waitFor(() => { expect(container.textContent).toContain("member-2"); expect(container.textContent).not.toContain("member-34"); });
    } finally {
      await act(async () => root.unmount()); client.clear(); container.remove(); useAuthStore.getState().clear();
    }
  });
});
