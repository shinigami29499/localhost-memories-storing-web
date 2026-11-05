// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { PageActionBar, PageActionBarProvider } from "./PageActionBar";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("PageActionBar", () => {
  it("renders outside hidden page content and keeps shared actions with current handlers", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const first = vi.fn();
    const second = vi.fn();
    const renderPage = (page: string, onClick: () => void) => (
      <PageActionBarProvider>
        <main key={page} inert style={{ visibility: "hidden" }}>
          <PageActionBar role="group">
            <button key="primary" onClick={onClick}>{page}</button>
          </PageActionBar>
        </main>
      </PageActionBarProvider>
    );
    try {
      await act(async () => root.render(renderPage("Upload", first)));
      const button = container.querySelector("button")!;
      expect(button.closest("main")).toBeNull();
      expect(button.closest(".page-action-bar")).not.toBeNull();
      await act(async () => button.click());
      expect(first).toHaveBeenCalledOnce();
      await act(async () => root.render(renderPage("Create album", second)));
      const nextButton = container.querySelector("button")!;
      expect(nextButton.closest("main")).toBeNull();
      expect(nextButton.textContent).toBe("Create album");
      await act(async () => nextButton.click());
      expect(first).toHaveBeenCalledOnce();
      expect(second).toHaveBeenCalledOnce();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
