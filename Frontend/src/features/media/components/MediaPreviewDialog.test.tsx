// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaPreviewDialog } from "./MediaPreviewDialog";
import type { MediaFile } from "../types";

const state = vi.hoisted(() => ({
  selected: 0,
  select: undefined as (() => void) | undefined,
}));

vi.mock("@animate-ui/react/primitives/carousel", () => {
  const api = {
    selectedScrollSnap: () => state.selected,
    scrollSnapList: () => [0, 1, 2],
    scrollTo: (index: number) => { state.selected = index; },
    scrollNext: () => { state.selected++; state.select?.(); },
    scrollPrev: () => { state.selected--; state.select?.(); },
    on(name: string, listener: () => void) {
      if (name === "select") state.select = listener;
      return this;
    },
    off() { return this; },
  };
  return {
    default: () => [() => {}, api],
    CarouselCounter: () => null,
    CarouselDots: () => null,
  };
});

vi.mock("motion/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("motion/react")>(),
  useInView: () => true,
}));
vi.mock("../../albums/hooks/useAlbums", () => ({
  useAlbums: () => ({ data: [] }),
}));

const image: MediaFile = {
  id: "image", mediaKind: "image", mimeType: "image/png", originalFilename: "photo.png",
  fileSizeBytes: 100, createdAt: "2026-10-28T12:00:00Z", isFavorited: false,
};
const media: MediaFile[] = [
  image,
  { ...image, id: "video", mediaKind: "video", mimeType: "video/mp4", originalFilename: "clip.mp4" },
  { ...image, id: "other-image" },
];

function RouteProbe() {
  const location = useLocation();
  return <output data-path={location.pathname} data-search={location.search} />;
}

describe("MediaPreviewDialog resolution loading", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    state.selected = 0;
    state.select = undefined;
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("SVGGeometryElement", class extends SVGElement {});
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })));
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value: vi.fn() },
      close: { configurable: true, value: vi.fn() },
    });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
    vi.unstubAllGlobals();
  });

  function render(includeDeleted = false) {
    const actions = includeDeleted
      ? { trashActions: { onRestore: vi.fn(), onDelete: vi.fn() } }
      : { onToggleFavorite: vi.fn() };
    act(() => root.render(
      <MemoryRouter>
        <MediaPreviewDialog media={media} initialMediaId="image" onClose={vi.fn()} {...actions} />
      </MemoryRouter>,
    ));
  }

  function sources() {
    return Array.from(container.querySelectorAll<HTMLImageElement | HTMLVideoElement>(
      ".media-preview-dialog__stage img, .media-preview-dialog__stage video",
    ), (element) => new URL(element.src));
  }

  function navigate(key: string) {
    act(() => container.querySelector("dialog")!.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key }),
    ));
  }

  it.each([false, true])("loads exactly one original and switches it on navigation (trash=%s)", (includeDeleted) => {
    render(includeDeleted);
    expect(sources().map((url) => url.searchParams.has("preview"))).toEqual([false, true, true]);
    expect(container.querySelector("video")).toBeNull();
    expect(sources().every((url) => url.searchParams.has("includeDeleted") === includeDeleted)).toBe(true);

    navigate("ArrowRight");
    expect(sources().map((url) => url.searchParams.has("preview"))).toEqual([true, false, true]);
    expect(container.querySelector("video")?.src).toContain("/api/media/video/file?");
    expect(container.querySelector("video")?.controls).toBe(true);

    navigate("ArrowRight");
    expect(sources().map((url) => url.searchParams.has("preview"))).toEqual([true, true, false]);
    expect(container.querySelector("video")).toBeNull();
  });

  it("does not let a failed neighboring preview block the active original", () => {
    render();
    const neighbor = container.querySelectorAll(".media-preview-dialog__stage img")[1];
    act(() => neighbor.dispatchEvent(new Event("error")));
    expect(container.querySelectorAll(".media-preview-dialog__stage img")).toHaveLength(2);
    navigate("ArrowRight");
    expect(container.querySelector("video")).not.toBeNull();
    expect(sources().filter((url) => !url.searchParams.has("preview"))).toHaveLength(1);
  });

  it("navigates to the selected photo location", () => {
    const onClose = vi.fn();
    act(() => root.render(
      <MemoryRouter>
        <MediaPreviewDialog
          media={[{ ...image, location: { latitude: 10, longitude: 20 } }]}
          initialMediaId="image"
          onClose={onClose}
          onToggleFavorite={vi.fn()}
        />
        <RouteProbe />
      </MemoryRouter>,
    ));

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="View photo location"]')!.click());

    expect(onClose).toHaveBeenCalledWith("image");
    expect(container.querySelector("output")?.getAttribute("data-path")).toBe("/locations");
    expect(container.querySelector("output")?.getAttribute("data-search")).toBe("?mediaId=image");
  });
});
