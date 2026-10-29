// @vitest-environment jsdom
import { act, type PropsWithChildren } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaGallery } from "./MediaGallery";
import type { MediaFile } from "../types";

vi.mock("@animate-ui/react/icons", () => ({
  AnimateIcon: ({ children }: PropsWithChildren) => children,
  IconWrapper: ({ children }: PropsWithChildren) => children,
}));
vi.mock("../../../context/LocaleContext", () => ({
  useLocale: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      key.replace(/\{(\w+)\}/g, (_match, name: string) => String(values?.[name] ?? `{${name}}`)),
  }),
}));
vi.mock("../../../utils/media", () => ({
  mediaUrl: (id: string) => `/media/${id}`,
}));
vi.mock("./MediaCarousel", () => ({
  MediaCarousel: ({ initialIndex }: { initialIndex: number }) => (
    <div data-testid="media-carousel" data-initial-index={initialIndex} />
  ),
}));

const media: MediaFile[] = Array.from({ length: 5 }, (_, index) => ({
  id: `media-${index + 1}`,
  mediaKind: "image",
  mimeType: "image/png",
  originalFilename: `image-${index + 1}.png`,
  fileSizeBytes: 100,
  storagePath: `image-${index + 1}.png`,
}));

describe("MediaGallery", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn((media: string) => ({
      matches: false,
      media,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })));
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: {
        configurable: true,
        value(this: HTMLDialogElement) { this.setAttribute("open", ""); },
      },
      close: {
        configurable: true,
        value(this: HTMLDialogElement) { this.removeAttribute("open"); },
      },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<MediaGallery media={media} />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
    vi.unstubAllGlobals();
  });

  function openCarousel() {
    act(() => container.querySelector<HTMLImageElement>(".media-gallery--inline img")!.click());
  }

  it("shows a single full-size preview until an image opens the carousel", () => {
    expect(container.querySelectorAll(".media-gallery__slide")).toHaveLength(1);
    expect(container.querySelector(".media-gallery__dots")).toBeNull();
    expect(container.querySelector("dialog")).toBeNull();

    openCarousel();

    expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(true);
    expect(container.querySelector('dialog [data-testid="media-carousel"]')).not.toBeNull();

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Close image preview"]')!.click());
    expect(container.querySelector("dialog")).toBeNull();
    expect(container.querySelectorAll(".media-gallery__slide")).toHaveLength(1);
  });

  it("opens the preview with the selected inline image", () => {
    act(() => container.querySelector<HTMLImageElement>(".media-gallery--inline img")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    ));
    expect(container.querySelector('[data-testid="media-carousel"]')?.getAttribute("data-initial-index")).toBe("0");
  });
});
