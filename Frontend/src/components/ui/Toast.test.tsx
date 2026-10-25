// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "./Toast";

describe("ToastProvider", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders the app when no toast is active", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      root.render(
        <ToastProvider>
          <main>Application content</main>
        </ToastProvider>,
      );
    });

    expect(container.textContent).toContain("Application content");
    expect(consoleError).not.toHaveBeenCalled();
  });
});
