// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaFile } from "../../features/media/types";
import { VirtualGalleryGroup } from "./VirtualGalleryGroup";

vi.mock("../../features/media/components/MediaTile", () => ({
  MediaTile: ({ media }: { media: MediaFile }) => <button data-media-id={media.id}>{media.id}</button>,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("VirtualGalleryGroup", () => {
  let container: HTMLDivElement;
  let root: Root;
  const items = Array.from({ length: 1000 }, (_, index) => ({ id: `media-${index}` } as MediaFile));
  const props = {
    items, selectionMode: false, selectedItems: new Map<string, MediaFile>(),
    onSelect: vi.fn(), onFavorite: vi.fn(), favoriteBusy: false, onOpen: vi.fn(),
  };
  let visibility: IntersectionObserverCallback;
  const disconnect = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) { visibility = callback; }
      observe() {
        visibility([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
      }
      disconnect = disconnect;
    });
  });

  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    container?.remove();
    vi.unstubAllGlobals();
    disconnect.mockClear();
  });

  it("bounds mounted tiles and retains a pinned viewer target", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<VirtualGalleryGroup {...props} viewport={{ top: 0, height: 800, width: 1200 }} pinnedId="media-900" />));

    expect(container.querySelectorAll("[data-gallery-window-id]").length).toBeLessThan(100);
    expect(container.querySelector('[data-media-id="media-0"]')).not.toBeNull();
    expect(container.querySelector('[data-media-id="media-900"]')).not.toBeNull();

    await act(async () => root.render(<VirtualGalleryGroup {...props} viewport={{ top: 8000, height: 800, width: 1200 }} pinnedId="media-900" />));
    expect(container.querySelectorAll("[data-gallery-window-id]").length).toBeLessThan(100);
    expect(container.querySelector('[data-media-id="media-900"]')).not.toBeNull();
  });

  it("moves keyboard focus to an unmounted tile at the window boundary", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<div className="gallery-page__content">
      <VirtualGalleryGroup {...props} viewport={{ top: 0, height: 800, width: 1200 }} />
    </div>));
    const tiles = container.querySelectorAll<HTMLButtonElement>("[data-media-id]");
    const last = tiles[tiles.length - 1];
    const nextIndex = Number(last.dataset.mediaId!.split("-")[1]) + 1;
    last.focus();
    await act(async () => last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })));
    expect((document.activeElement as HTMLElement).dataset.mediaId).toBe(`media-${nextIndex}`);
  });

  it("allows keyboard navigation into a completely offscreen group", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<div className="gallery-page__content">
      <VirtualGalleryGroup {...props} viewport={{ top: 1000000, height: 800, width: 1200 }} active={false} />
    </div>));
    expect(container.querySelectorAll("[data-media-id]")).toHaveLength(0);
    const entry = container.querySelector<HTMLElement>('[aria-label="Enter media group"]')!;
    await act(async () => entry.focus());
    expect((document.activeElement as HTMLElement).dataset.mediaId).toBe("media-0");
  });

  it("reuses physical cells and buttons after a large horizontal scroll", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<VirtualGalleryGroup {...props} viewport={{ top: 0, height: 800, width: 1200 }} />));
    const row = container.querySelector<HTMLElement>(".gallery-day-row")!;
    await act(async () => {
      row.scrollLeft = 1000;
      row.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    const cells = new Set(container.querySelectorAll("[data-gallery-window-id]"));
    const buttons = new Set(container.querySelectorAll("button"));
    await act(async () => {
      row.scrollLeft = 4000;
      row.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    const currentCells = [...container.querySelectorAll("[data-gallery-window-id]")];
    expect(currentCells.length).toBeLessThan(20);
    expect(currentCells.every((cell) => cells.has(cell))).toBe(true);
    expect([...container.querySelectorAll("button")].every((button) => buttons.has(button))).toBe(true);
    expect(container.querySelector('[data-media-id="media-0"]')).toBeNull();
  });

  it("unmounts offscreen media on desktop while keeping keyboard entry points", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<VirtualGalleryGroup {...props} viewport={{ top: 0, height: 800, width: 1200 }} />));
    await act(async () => visibility(
      [{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver,
    ));
    expect(container.querySelectorAll("[data-media-id]")).toHaveLength(0);
    expect(container.querySelector('[aria-label="Enter media group"]')).not.toBeNull();
    await act(async () => root.render(null));
    expect(disconnect).toHaveBeenCalled();
  });
});
