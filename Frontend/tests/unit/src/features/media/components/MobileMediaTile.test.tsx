// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MobileMediaTile } from "../../../../../../apps/mobile/src/gallery/MobileMediaTile";

vi.mock("motion/react", async (original) => ({
  ...await original<typeof import("motion/react")>(), useInView: () => true,
}));
vi.mock("@/utils/media", () => ({ mediaPreviewUrl: (id: string) => `/preview/${id}` }));

const media = { id: "first", mediaKind: "image" as const, originalFilename: "first.jpg", createdAt: "2026-10-28T12:00:00Z", isFavorited: false };
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const onSelect = vi.fn();
const onOpen = vi.fn();

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("SVGGeometryElement", class extends SVGElement {});
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.useFakeTimers();
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("recycles failed previews without carrying failure to the next item", () => {
  const render = (item: typeof media) => act(() => root.render(<MobileMediaTile media={item} selectionMode={false} selected={false} onSelect={onSelect} onOpen={onOpen} />));
  render(media);
  const button = container.querySelector("button")!;
  act(() => button.querySelector("img")!.dispatchEvent(new Event("error")));
  expect(button.querySelector("img")).toBeNull();
  render({ ...media, id: "second", originalFilename: "second.jpg" });
  expect(container.querySelector("button")).toBe(button);
  expect(button.getAttribute("aria-label")).toBe("Open second.jpg");
  expect(button.querySelector("img")?.getAttribute("src")).toBe("/preview/second");
});

it("selects on hold and suppresses the release click", () => {
  act(() => root.render(<MobileMediaTile media={media} selectionMode={false} selected={false} onSelect={onSelect} onOpen={onOpen} />));
  const button = container.querySelector("button")!;
  const down = new MouseEvent("pointerdown", { bubbles: true, button: 0 });
  Object.defineProperty(down, "isPrimary", { value: true });
  act(() => { button.dispatchEvent(down); vi.advanceTimersByTime(500); button.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })); });
  expect(onSelect).toHaveBeenCalledWith("first");
  expect(onOpen).not.toHaveBeenCalled();
});

