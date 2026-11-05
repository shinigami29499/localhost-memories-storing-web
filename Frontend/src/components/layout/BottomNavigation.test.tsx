// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomNavigation } from "./BottomNavigation";

const logout = vi.hoisted(() => vi.fn());
vi.mock("../../features/auth/hooks/useLogout", () => ({ useLogout: () => logout }));

describe("mobile navigation", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); logout.mockClear(); });

  it("exposes the main destinations and account actions", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
    const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    } });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    } });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<MemoryRouter initialEntries={["/gallery"]}><BottomNavigation /></MemoryRouter>));
      const links = [...container.querySelectorAll<HTMLAnchorElement>(".bottom-navigation a")];
      expect(links.map((link) => link.getAttribute("href"))).toEqual(["/", "/gallery", "/location", "/uploads"]);
      expect(links[1].getAttribute("aria-current")).toBe("page");
      const more = container.querySelector<HTMLButtonElement>('.bottom-navigation button')!;
      await act(async () => more.click());
      const dialog = container.querySelector<HTMLDialogElement>("dialog")!;
      expect(dialog.open).toBe(true);
      expect([...dialog.querySelectorAll("a")].map((link) => link.getAttribute("href")))
        .toEqual(["/users", "/profile", "/settings"]);
      const logoutButton = [...dialog.querySelectorAll("button")].find((button) => button.textContent?.includes("Log out"))!;
      await act(async () => logoutButton.click());
      expect(logout).toHaveBeenCalledOnce();
      expect(dialog.open).toBe(false);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      if (originalShow) Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShow);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
      if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
    }
  });
});
