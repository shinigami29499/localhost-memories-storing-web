// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaTile } from "./MediaTile";
import { MediaRetryProvider } from "./MediaRetryProvider";
import { GalleryLoadingProvider } from "./GalleryLoadingProvider";
import type { MediaFile } from "../types";

vi.mock("motion/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("motion/react")>(),
  useInView: () => true,
}));

vi.mock("../../../utils/media", () => ({
  mediaPreviewUrl: (id: string, includeDeleted = false, previewSize = 640) => `/media/${id}?preview=true${includeDeleted ? "&includeDeleted=true" : ""}${previewSize === 640 ? "" : `&previewSize=${previewSize}`}`,
}));

const image: MediaFile = {
  id: "image", mediaKind: "image", originalFilename: "photo.png",
  createdAt: "2026-10-28T12:00:00Z", isFavorited: false,
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

  it("resets failed preview and retry state when a cell receives another item", () => {
    const button = render();
    act(() => button.querySelector("img")!.dispatchEvent(new Event("error")));
    expect(button.querySelector("img")).toBeNull();
    render({ media: { ...image, id: "replacement", originalFilename: "replacement.png" } });
    expect(container.querySelector("button")).toBe(button);
    expect(button.getAttribute("aria-label")).toBe("Open replacement.png");
    expect(button.querySelector("img")?.getAttribute("src")).toContain("/media/replacement?");
    expect(button.querySelector(".media-tile__retry")).toBeNull();
  });

  it("defers a newly recycled image until scrolling stops", () => {
    const containerRef = { current: container };
    const renderInGallery = (id: string) => act(() => root.render(
      <GalleryLoadingProvider containerRef={containerRef}>
        <MediaTile media={{ ...image, id }} selectionMode={false} selected={false}
          onSelect={onSelect} onOpen={onOpen} />
      </GalleryLoadingProvider>,
    ));
    renderInGallery("first");
    expect(container.querySelector("img")?.getAttribute("src")).toContain("/media/first?");
    act(() => container.querySelector("button")!.dispatchEvent(new Event("scroll")));
    renderInGallery("second");
    expect(container.querySelector("img")).toBeNull();
    act(() => vi.advanceTimersByTime(139));
    expect(container.querySelector("img")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector("img")?.getAttribute("src")).toContain("/media/second?");
  });

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
    expect(button.querySelector("img")?.getAttribute("src")).toBe("/media/image?preview=true&previewSize=320");
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

  it("does not open a failed preview", async () => {
    const button = render();
    await act(async () => button.querySelector("img")!.dispatchEvent(new Event("error")));
    click(button);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("retries failed previews eagerly and keeps other preview elements mounted", async () => {
    const [first, loaded, clicked] = renderRetryGroup();
    await act(async () => {
      first.querySelector("img")!.dispatchEvent(new Event("error"));
      clicked.querySelector("img")!.dispatchEvent(new Event("error"));
    });
    renderRetryGroup();
    click(clicked, 0);
    expect(clicked.querySelector("img")?.getAttribute("loading")).toBe("eager");
    await act(async () => clicked.querySelector("img")!.dispatchEvent(new Event("load")));
    expect(first.querySelector("img")?.getAttribute("loading")).toBe("eager");
    expect(loaded.querySelector("img")).not.toBeNull();
    await act(async () => first.querySelector("img")!.dispatchEvent(new Event("load")));
  });

  it.each(["image", "video"] as const)("keeps offscreen %s previews mounted", (mediaKind) => {
    const media = { ...image, mediaKind };
    const button = render({ media, selectionMode: true, selected: true });
    expect(button.querySelectorAll("img, video")).toHaveLength(1);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.querySelector(".media-tile__selection")).not.toBeNull();

    render({ media, selectionMode: true, selected: true });
    expect(button.querySelector("img")?.getAttribute("src")).toBe("/media/image?preview=true&previewSize=320");

    render({ media, selectionMode: true, selected: true });
    expect(button.querySelectorAll("img, video")).toHaveLength(1);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("opens immediately on a single click", () => {
    const button = render();
    click(button);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("image");
  });

  it("does not favorite on double-click", () => {
    const button = render();
    click(button);
    click(button, 2);
    act(() => button.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, detail: 2 })));
    expect(onFavorite).not.toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalledTimes(2);
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

  it("opens immediately and applies selection mode to later clicks", () => {
    const button = render();
    click(button);
    render({ selectionMode: true });
    click(button);
    act(() => root.render(null));
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("image");
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("image");
  });
});
