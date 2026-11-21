// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileMediaPreviewDialog as MediaPreviewDialog } from "../../../../../../apps/mobile/src/gallery/MobileMediaPreviewDialog";
import type { MediaFile } from "../../../../../../src/features/media/types";


const state = vi.hoisted(() => ({
  selected: 0,
  select: undefined as (() => void) | undefined,
  settle: undefined as (() => void) | undefined,
}));

vi.mock("@animate-ui/react/primitives/carousel", () => {
  const api = {
    selectedScrollSnap: () => state.selected,
    scrollSnapList: () => [0, 1, 2],
    scrollTo: (index: number) => { state.selected = index; },
    scrollNext: () => { state.selected++; state.select?.(); state.settle?.(); },
    scrollPrev: () => { state.selected--; state.select?.(); state.settle?.(); },
    on(name: string, listener: () => void) {
      if (name === "select") state.select = listener;
      if (name === "settle") state.settle = listener;
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
vi.mock("../../../../../../src/features/albums/hooks/useAlbums", () => ({
  useAlbums: () => ({ data: [] }),
}));

vi.mock("../../../../../../apps/mobile/src/gallery/MobileSaveToAlbumDialog", () => ({
  MobileSaveToAlbumDialog: ({ onClose, portalContainer }: { onClose: () => void; portalContainer: HTMLElement | null }) => (
    <button data-portal={portalContainer?.tagName} onClick={onClose}>Close mobile album picker</button>
  ),
}));

const image: MediaFile = {
  id: "image", mediaKind: "image", originalFilename: "photo.png",
  createdAt: "2026-10-28T12:00:00Z", isFavorited: false,
};
const media: MediaFile[] = [
  image,
  { ...image, id: "video", mediaKind: "video", originalFilename: "clip.mp4" },
  { ...image, id: "other-image" },
];

function RouteProbe() {
  const location = useLocation();
  return <output data-path={location.pathname} data-search={location.search} />;
}

describe("MediaPreviewDialog resolution loading", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    state.selected = 0;
    state.select = undefined;
    state.settle = undefined;
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("SVGGeometryElement", class extends SVGElement {});
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })));
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = true; }) },
      close: { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = false; }) },
    });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    queryClient.clear();
    container.remove();
    vi.restoreAllMocks();
    Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
    vi.unstubAllGlobals();
  });

  function render() {
    act(() => root.render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MediaPreviewDialog media={media} initialMediaId="image" onClose={vi.fn()} onToggleFavorite={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
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

  it("opens the mobile album picker and returns focus to its trigger", async () => {
    render();
    const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="Save to album"]')!;
    await act(async () => { trigger.click(); });
    await vi.waitFor(() => expect(container.querySelector('[data-portal="DIALOG"]')).not.toBeNull());
    await act(async () => container.querySelector<HTMLButtonElement>('[data-portal="DIALOG"]')!.click());
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when the last visible media item is removed", () => {
    const onClose = vi.fn();
    const onToggleFavorite = vi.fn();
    const renderItems = (items: MediaFile[]) => act(() => root.render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MediaPreviewDialog
            media={items}
            initialMediaId={image.id}
            onClose={onClose}
            onToggleFavorite={onToggleFavorite}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    ));

    renderItems([image]);
    expect(container.querySelector("dialog")).not.toBeNull();
    renderItems([]);

    expect(onClose).toHaveBeenCalledExactlyOnceWith(image.id);
  });



});
