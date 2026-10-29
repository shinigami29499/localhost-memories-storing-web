// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../context/LocaleContext";
import { EmptyState, ErrorState } from "./Status";
import { showToast } from "./Toast";

vi.mock("./Toast", () => ({
  showToast: { error: vi.fn() },
}));

describe("Status feedback", () => {
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
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps an error visible even without a retry action", async () => {
    await act(async () => root.render(<ErrorState message="Could not load media." />));

    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Could not load media.");
    expect(container.querySelector("button")).toBeNull();
    expect(showToast.error).not.toHaveBeenCalled();
  });

  it("does not emit duplicate toasts on rerenders or remounts", async () => {
    await act(async () => root.render(<ErrorState message="Could not load media." />));
    await act(async () => root.render(<ErrorState message="Could not load media." />));
    await act(async () => root.render(null));
    await act(async () => root.render(<ErrorState message="Could not load media." />));

    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(showToast.error).not.toHaveBeenCalled();
  });

  it("keeps the existing retry action", async () => {
    const retry = vi.fn();
    await act(async () => root.render(<ErrorState message="Could not load albums." onRetry={retry} />));
    await act(async () => container.querySelector("button")!.click());

    expect(retry).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Could not load albums.");
  });

  it("localizes persistent error feedback", async () => {
    window.localStorage.setItem("shinigacim.language", "vi");
    try {
      await act(async () => root.render(
        <LocaleProvider><ErrorState message="Could not load media." onRetry={vi.fn()} /></LocaleProvider>,
      ));

      expect(container.querySelector('[role="alert"]')?.textContent).toBe("Không thể tải nội dung.");
      expect(container.querySelector("button")?.textContent).toBe("Thử lại");
    } finally {
      window.localStorage.removeItem("shinigacim.language");
      document.documentElement.removeAttribute("lang");
    }
  });

  it("renders empty-state context without an unnecessary action", async () => {
    await act(async () => root.render(<EmptyState title="No albums yet" hint="Create an album to get started." />));

    expect(container.querySelector(".empty-state__title")?.textContent).toBe("No albums yet");
    expect(container.querySelector(".empty-state__hint")?.textContent).toBe("Create an album to get started.");
  });
});
