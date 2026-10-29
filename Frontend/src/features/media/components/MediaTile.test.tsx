// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaTile } from "./MediaTile";
import { MediaRetryProvider } from "./MediaRetryProvider";
import type { MediaFile } from "../types";

const { useInView } = vi.hoisted(() => ({ useInView: vi.fn(() => true) }));
vi.mock("motion/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("motion/react")>(),
  useInView,
}));

vi.mock("../../../utils/media", () => ({
  mediaPreviewUrl: (id: string, includeDeleted = false) => `/media/${id}?preview=true${includeDeleted ? "&includeDeleted=true" : ""}`,
}));

const image: MediaFile = {
  id: "image", mediaKind: "image", mimeType: "image/png", originalFilename: "photo.png",
  fileSizeBytes: 100, createdAt: "2026-10-28T12:00:00Z", isFavorited: false,
};

describe("MediaTile", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onSelect = vi.fn();
  const onOpen = vi.fn();
  const onFavorite = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("SVGGeometryElement", class extends SVGElement {});
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.useFakeTimers();
    vi.clearAllMocks();
    useInView.mockReturnValue(true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function render(overrides: Partial<Parameters<typeof MediaTile>[0]> = {}) {
    act(() => root.render(
      <MediaTile
        media={image} selectionMode={false} selected={false} favoriteDisabled={false}
        onSelect={onSelect} onOpen={onOpen} onFavorite={onFavorite} {...overrides}
      />,
    ));
    return container.querySelector("button")!;
  }

  function click(button: HTMLButtonElement, detail = 1) {
    act(() => button.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })));
  }

  function pointer(button: HTMLButtonElement, type: string, x = 0, y = 0) {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperty(event, "isPrimary", { value: true });
    act(() => button.dispatchEvent(event));
  }

  it("shows only the image, without captions or icons", () => {
    const button = render();
    expect(button.getAttribute("aria-label")).toBe("Open photo.png");
    expect(button.querySelector("img")).not.toBeNull();
    expect(button.textContent).toBe("");
    expect(button.querySelector("svg")).toBeNull();
  });

  it("loads a still preview for video without requesting its original", () => {
    const button = render({ media: { ...image, mediaKind: "video" } });
    expect(button.querySelector("video")).toBeNull();
    expect(button.querySelector("img")?.getAttribute("src")).toBe("/media/image?preview=true");
    expect(button.querySelector(".media-tile__video")).toBeNull();
  });

  it.each(["image", "video"] as const)("replaces a failed %s with a retry control without opening or favoriting", async (mediaKind) => {
    const button = render({ media: { ...image, mediaKind } });
    await act(async () => button.querySelector("img, video")!.dispatchEvent(new Event("error")));
    expect(button.querySelector("img, video")).toBeNull();
    expect(button.querySelector(".media-tile__retry svg")).not.toBeNull();
    expect(button.getAttribute("aria-label")).toBe("Retry all failed media, starting with photo.png");

    click(button, 0);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.querySelector("img, video")?.getAttribute("src")).toContain("&previewRetry=1");
    await act(async () => button.querySelector("img")!.dispatchEvent(new Event("load")));
    expect(button.querySelector(".media-tile__retry")).toBeNull();
    expect(button.getAttribute("aria-label")).toBe("Open photo.png");
    expect(onOpen).not.toHaveBeenCalled();
    expect(onFavorite).not.toHaveBeenCalled();
  });

  function renderRetryGroup() {
    act(() => root.render(
      <MediaRetryProvider order={["first", "loaded", "clicked", "last"]}>
        {["first", "loaded", "clicked", "last"].map((id) => (
          <MediaTile key={id} media={{ ...image, id }} selectionMode={false} selected={false}
            onSelect={onSelect} onOpen={onOpen} onFavorite={onFavorite} />
        ))}
      </MediaRetryProvider>,
    ));
    return Array.from(container.querySelectorAll<HTMLButtonElement>(".media-tile"));
  }

  it("retries clicked media first, then failures from left to right, skipping successful media", async () => {
    const [first, loaded, clicked, last] = renderRetryGroup();
    const successfulImage = loaded.querySelector("img");
    await act(async () => {
      for (const tile of [first, clicked, last]) tile.querySelector("img")!.dispatchEvent(new Event("error"));
      loaded.querySelector("img")!.dispatchEvent(new Event("load"));
    });

    click(clicked, 0);
    expect(clicked.querySelector("img")?.getAttribute("src")).toContain("previewRetry=1");
    expect(first.querySelector("img")).toBeNull();
    expect(last.querySelector("img")).toBeNull();
    click(first, 0);
    expect(first.querySelector("img")).toBeNull();

    await act(async () => clicked.querySelector("img")!.dispatchEvent(new Event("load")));
    expect(first.querySelector("img")?.getAttribute("src")).toContain("previewRetry=1");
    expect(last.querySelector("img")).toBeNull();
    await act(async () => first.querySelector("img")!.dispatchEvent(new Event("error")));
    expect(last.querySelector("img")?.getAttribute("src")).toContain("previewRetry=1");
    await act(async () => last.querySelector("img")!.dispatchEvent(new Event("load")));
    expect(loaded.querySelector("img")).toBe(successfulImage);
    expect(first.querySelector(".media-tile__retry")).not.toBeNull();
    expect(first.hasAttribute("aria-disabled")).toBe(false);
    expect(onOpen).not.toHaveBeenCalled();
    expect(onFavorite).not.toHaveBeenCalled();
  });

  it("continues the retry queue after a stalled request and stops cleanly on unmount", async () => {
    const [first, , clicked] = renderRetryGroup();
    await act(async () => {
      first.querySelector("img")!.dispatchEvent(new Event("error"));
      clicked.querySelector("img")!.dispatchEvent(new Event("error"));
    });
    click(clicked, 0);
    await act(async () => vi.advanceTimersByTime(30000));
    expect(clicked.querySelector("img")).toBeNull();
    expect(first.querySelector("img")?.getAttribute("src")).toContain("previewRetry=1");
    await act(async () => root.render(null));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps failed tiles selectable and avoids favorite gestures", async () => {
    const button = render();
    await act(async () => button.querySelector("img")!.dispatchEvent(new Event("error")));
    act(() => button.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    expect(onFavorite).not.toHaveBeenCalled();
    render({ selectionMode: true });
    click(button, 0);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("image");
    expect(button.querySelector("img")).toBeNull();
  });

  it("does not open a preview that fails during the single-click delay", async () => {
    const button = render();
    click(button);
    await act(async () => button.querySelector("img")!.dispatchEvent(new Event("error")));
    act(() => vi.advanceTimersByTime(350));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("retries failed offscreen previews eagerly without remounting other offscreen media", async () => {
    const [first, loaded, clicked] = renderRetryGroup();
    await act(async () => {
      first.querySelector("img")!.dispatchEvent(new Event("error"));
      clicked.querySelector("img")!.dispatchEvent(new Event("error"));
    });
    useInView.mockReturnValue(false);
    renderRetryGroup();
    click(clicked, 0);
    expect(clicked.querySelector("img")?.getAttribute("loading")).toBe("eager");
    await act(async () => clicked.querySelector("img")!.dispatchEvent(new Event("load")));
    expect(first.querySelector("img")?.getAttribute("loading")).toBe("eager");
    expect(loaded.querySelector("img")).toBeNull();
    await act(async () => first.querySelector("img")!.dispatchEvent(new Event("load")));
  });

  it.each(["image", "video"] as const)("unmounts offscreen %s previews and restores them on re-entry", (mediaKind) => {
    const media = { ...image, mediaKind };
    useInView.mockReturnValue(false);
    const button = render({ media, selectionMode: true, selected: true });
    expect(button.querySelectorAll("img, video")).toHaveLength(0);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.querySelector(".media-tile__selection")).not.toBeNull();

    useInView.mockReturnValue(true);
    render({ media, selectionMode: true, selected: true });
    expect(button.querySelectorAll("img, video")).toHaveLength(1);
    expect(button.querySelector("img")?.getAttribute("src")).toBe("/media/image?preview=true");

    useInView.mockReturnValue(false);
    render({ media, selectionMode: true, selected: true });
    expect(button.querySelectorAll("img, video")).toHaveLength(0);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("opens on a single click after the double-click window", () => {
    const button = render();
    click(button);
    act(() => vi.advanceTimersByTime(349));
    expect(onOpen).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("image");
  });

  it("double-click adds a favorite without opening the viewer", () => {
    const button = render();
    click(button);
    pointer(button, "pointerdown");
    pointer(button, "pointerup");
    click(button, 2);
    act(() => button.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, detail: 2 })));
    act(() => vi.advanceTimersByTime(1000));
    expect(onFavorite).toHaveBeenCalledExactlyOnceWith("image");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it.each([
    { media: { ...image, isFavorited: true } },
    { favoriteDisabled: true },
    { selectionMode: true },
  ])("does not favorite when already saved, busy, or selecting: %o", (overrides) => {
    const button = render(overrides);
    act(() => button.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    expect(onFavorite).not.toHaveBeenCalled();
  });

  it("holds for 500ms to select and suppresses the release click", () => {
    const button = render();
    pointer(button, "pointerdown");
    act(() => vi.advanceTimersByTime(499));
    expect(onSelect).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("image");
    render({ selectionMode: true, selected: true });
    pointer(button, "pointerup");
    click(button);
    act(() => vi.advanceTimersByTime(1000));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("disables hold and keyboard selection when selection is disabled", () => {
    const button = render({ selectionEnabled: false });
    pointer(button, "pointerdown");
    act(() => vi.advanceTimersByTime(500));
    expect(onSelect).not.toHaveBeenCalled();
    expect(button.getAttribute("aria-description")).not.toContain("Hold to select");
    act(() => button.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " ", shiftKey: true })));
    expect(onSelect).not.toHaveBeenCalled();
    click(button, 0);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("image");
  });

  it.each(["pointermove", "pointercancel", "pointerout"])("cancels holding on %s", (type) => {
    const button = render();
    pointer(button, "pointerdown");
    pointer(button, type, 20, 20);
    act(() => vi.advanceTimersByTime(1000));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("toggles selection instead of opening while selection mode is active", () => {
    const button = render({ selectionMode: true });
    click(button);
    act(() => vi.advanceTimersByTime(1000));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("image");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("supports keyboard open, Shift+Space selection, and F favorite", () => {
    const button = render();
    click(button, 0);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("image");
    act(() => button.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " ", shiftKey: true })));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("image");
    act(() => button.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "f" })));
    expect(onFavorite).toHaveBeenCalledExactlyOnceWith("image");
  });

  it("opens trash immediately without favorite gestures", () => {
    const button = render({ includeDeleted: true });
    expect(button.getAttribute("aria-description")).toBe("Hold to select, or press Shift+Space.");
    expect(button.querySelector("img")?.getAttribute("src")).toContain("includeDeleted=true");
    click(button);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("image");
    act(() => button.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "f" })));
    act(() => button.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    expect(onFavorite).not.toHaveBeenCalled();
  });

  it("does not suppress keyboard activation after a cancelled pointer gesture", () => {
    const button = render();
    pointer(button, "pointerdown");
    pointer(button, "pointercancel");
    click(button, 0);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("image");
  });

  it("cancels pending clicks on selection changes and unmount", () => {
    const button = render();
    click(button);
    render({ selectionMode: true });
    act(() => vi.advanceTimersByTime(1000));
    expect(onOpen).not.toHaveBeenCalled();
    render();
    click(button);
    act(() => root.render(null));
    act(() => vi.advanceTimersByTime(1000));
    expect(onOpen).not.toHaveBeenCalled();
  });
});
