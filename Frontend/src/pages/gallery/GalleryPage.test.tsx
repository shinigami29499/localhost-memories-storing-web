// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GalleryPage, type GalleryView } from "./GalleryPage";
import { postService, reactionService } from "../../features/posts/services/postService";
import type { PagedFeed, Post } from "../../features/posts/types";
import { useAuthStore } from "../../store/authStore";
import { LocaleProvider } from "../../context/LocaleContext";

vi.mock("../../features/posts/components/MediaCarousel", () => ({
  MediaCarousel: ({ media, initialIndex }: { media: { id: string }[]; initialIndex: number }) => (
    <div data-testid="carousel" data-media={media.map((file) => file.id).join(",")} data-initial={initialIndex} />
  ),
}));

vi.mock("../../features/posts/services/postService", () => ({
  postService: { feed: vi.fn(), favorites: vi.fn(), remove: vi.fn() },
  reactionService: { add: vi.fn(), remove: vi.fn() },
}));

const image = {
  id: "image-1", mediaKind: "image" as const, mimeType: "image/png",
  createdAt: "2026-10-24T00:00:00Z", updatedAt: null, relativePath: "image.png",
};
const video = { ...image, id: "video-1", mediaKind: "video" as const, mimeType: "video/mp4" };
const post: Post = {
  id: "post-1", caption: "A community moment", createdAt: "2026-10-24T00:00:00Z",
  updatedAt: null, deletedAt: null, author: { id: "alice", username: "alice" },
  mediaCount: 2, commentCount: 0, reactionCounts: [], myReactionTypes: [], media: [image, video],
};
const pageData: PagedFeed<Post> = { offset: 0, limit: 20, total: 1, items: [post] };
const feedKey = (source = "feed", kind = "all") => ["feed", "gallery", 20, source, kind];
const infinite = (items: Post[], total = items.length) => ({
  pages: [{ items, total, nextOffset: undefined }],
  pageParams: [0],
});

function CurrentPath() {
  return <output data-testid="current-path">{useLocation().pathname}</output>;
}

describe("GalleryPage", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let observerCallbacks: IntersectionObserverCallback[];
  const originalScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollTo");

  beforeAll(() => {
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } },
      close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
  });

  afterAll(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
    if (originalScrollTo) Object.defineProperty(HTMLElement.prototype, "scrollTo", originalScrollTo);
    else Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
  });

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    if (!("SVGGeometryElement" in window)) vi.stubGlobal("SVGGeometryElement", SVGElement);
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    observerCallbacks = [];
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) { observerCallbacks.push(callback); }
      observe() {} unobserve() {} disconnect() {}
    });
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })));
    window.localStorage.clear();
    useAuthStore.setState({
      accessToken: "user-token",
      user: { id: "user", username: "reader", role: "user", status: "active", createdAt: post.createdAt },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(feedKey(), infinite([post]));
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
    useAuthStore.getState().clear();
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function renderPage(view?: GalleryView) {
    await act(async () => root.render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CurrentPath />
        <QueryClientProvider client={client}>
          <LocaleProvider><GalleryPage view={view} /></LocaleProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    ));
  }

  function button(label: string) {
    return Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((element) => element.textContent?.trim() === label)!;
  }

  const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });

  it("shows community cards for a regular user without moderation controls", async () => {
    await renderPage();
    expect(container.querySelector("h1")?.textContent).toBe("Pictures.");
    expect(container.querySelectorAll(".gallery-card")).toHaveLength(1);
    expect(container.querySelector(".gallery-card__caption")).toBeNull();
    expect(container.querySelector(".gallery-card__media")?.tagName).toBe("BUTTON");
    expect(container.querySelector("img")?.getAttribute("src")).toContain("accessToken=user-token");
    expect(container.querySelector("img")?.getAttribute("src")).not.toContain("includeDeleted");
    expect(container.querySelector('[aria-label*="Delete post"]')).toBeNull();
    expect(container.querySelector('[aria-label*="Restore post"]')).toBeNull();
    expect(container.querySelector(".gallery-page__content")?.contains(container.querySelector("footer"))).toBe(false);
  });

  it("supports keyboard-accessible selection and shows the rounded action footer", async () => {
    await renderPage();
    const media = container.querySelector<HTMLButtonElement>(".gallery-card__media")!;
    expect(container.querySelector(".gallery-page__select")).toBeNull();
    await act(async () => {
      media.dispatchEvent(new KeyboardEvent("keydown", { key: " ", shiftKey: true, bubbles: true }));
    });
    const checkbox = container.querySelector<HTMLElement>('[role="checkbox"]');
    expect(checkbox).not.toBeNull();
    expect(container.querySelector(".gallery-card__media")?.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".gallery-selection-bar__count")?.textContent).toBe("1 selected");

    await act(async () => checkbox!.click());
    expect(checkbox?.getAttribute("aria-checked")).toBe("false");
    expect(container.querySelector(".gallery-selection-bar__count")?.textContent).toBe("0 selected");

    await act(async () => checkbox!.click());
    expect(checkbox?.getAttribute("aria-checked")).toBe("true");
    expect(container.querySelector(".gallery-selection-bar__count")?.textContent).toBe("1 selected");
    expect(container.querySelector(".gallery-selection-bar")).not.toBeNull();
    expect(container.querySelector('[aria-label="Delete selected posts"]')).toBeNull();
  });

  it("enters selection mode and selects the pressed post after a long press", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await renderPage();
    const media = container.querySelector<HTMLButtonElement>(".gallery-card__media")!;
    await act(async () => {
      media.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 20, clientY: 20 }));
      vi.advanceTimersByTime(600);
      media.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0 }));
      media.click();
    });

    expect(container.querySelector(".gallery-selection-bar__count")?.textContent).toBe("1 selected");
    expect(container.querySelector("dialog")).toBeNull();
    vi.useRealTimers();
  });

  it("filters mixed favorites and shows only matching media tiles", async () => {
    client.setQueryData(feedKey("favorites"), infinite([post]));
    client.setQueryData(feedKey("favorites", "video"), infinite([post]));
    await renderPage("favorites");
    await act(async () => button("Video").click());
    expect(button("Video").getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".gallery-card video")?.getAttribute("src")).toContain("video-1");
    expect(container.querySelector(".gallery-card img")).toBeNull();
    expect(container.querySelector(".gallery-card__body")).toBeNull();
  });

  it("shows no media filter tabs on the Pictures page", async () => {
    await renderPage();
    expect(container.querySelector(".gallery-page__filters")).toBeNull();
    expect(container.querySelector('[aria-label="Pagination"]')).toBeNull();
    expect(container.querySelector("footer")).toBeNull();
  });

  it("opens a carousel of all visible media at the selected tile and links to its post", async () => {
    const second = { ...post, id: "post-2", media: [{ ...image, id: "image-2" }], mediaCount: 1 };
    client.setQueryData(feedKey(), infinite([second, post]));
    await renderPage();
    const tiles = container.querySelectorAll<HTMLButtonElement>(".gallery-card__media");
    expect(tiles[1].tagName).toBe("BUTTON");
    await act(async () => tiles[1].click());
    const carousel = container.querySelector('[data-testid="carousel"]');
    expect(container.querySelector("dialog.gallery-lightbox")?.hasAttribute("open")).toBe(true);
    expect(carousel?.getAttribute("data-media")).toBe("image-2,image-1,video-1");
    expect(carousel?.getAttribute("data-initial")).toBe("1");
    expect(container.querySelector('a[aria-label="Open post"]')?.getAttribute("href")).toBe("/posts/post-1");
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Close image preview"]')!.click());
    expect(container.querySelector("dialog")).toBeNull();
    expect(container.querySelector('[data-testid="current-path"]')?.textContent).toBe("/");
  });

  it("groups posts by day, shows five days, and reveals more on scroll", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 29, 12));
    const days = Array.from({ length: 7 }, (_, index) => ({
      ...post,
      id: `post-${index}`,
      createdAt: new Date(2026, 9, 29 - index, 10).toISOString(),
    }));
    client.setQueryData(feedKey(), infinite([days[0], { ...days[0], id: "post-0b" }, ...days.slice(1)]));
    await renderPage();
    const titles = () => Array.from(container.querySelectorAll(".gallery-group__title")).map((title) => title.textContent);
    expect(titles()).toEqual(["Today", "Yesterday", "Oct 27", "Oct 26", "Oct 25"]);
    expect(container.querySelector(".gallery-group")?.querySelectorAll(".gallery-card")).toHaveLength(2);
    expect(container.querySelector(".gallery-groups__end")).toBeNull();
    await act(async () => observerCallbacks.at(-1)!(
      [{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver,
    ));
    expect(titles()).toHaveLength(7);
    expect(container.querySelector(".gallery-groups__end")?.textContent).toBe("No more posts to show.");
    vi.useRealTimers();
  });

  it("loads more posts until the fifth day is complete", async () => {
    const older = { ...post, id: "older", createdAt: "2020-01-01T12:00:00Z" };
    client.setQueryData(feedKey(), {
      pages: [{ items: [post], total: 2, nextOffset: 1 }],
      pageParams: [0],
    });
    vi.mocked(postService.feed).mockResolvedValue({ ...pageData, offset: 1, total: 2, items: [older] });
    await renderPage();
    await flush();
    expect(postService.feed).toHaveBeenCalledWith(1, 20);
    expect(container.querySelectorAll(".gallery-group")).toHaveLength(2);
  });

  it("shows only videos without media filters on the Videos page", async () => {
    vi.mocked(postService.feed).mockResolvedValue(pageData);
    await renderPage("videos");
    await flush();
    expect(container.querySelector("h1")?.textContent).toBe("Videos.");
    expect(container.querySelector(".gallery-page__filters")).toBeNull();
    expect(postService.feed).toHaveBeenCalledWith(0, 20, "video");
    expect(container.querySelector(".gallery-card video")).not.toBeNull();
    expect(container.querySelector(".gallery-card img")).toBeNull();
  });

  it("loads hearted posts on the Favorites page", async () => {
    vi.mocked(postService.favorites).mockResolvedValue({ ...pageData, total: 0, items: [] });
    await renderPage("favorites");
    await flush();
    expect(container.querySelector("h1")?.textContent).toBe("Favorites.");
    expect(postService.favorites).toHaveBeenCalledWith(0, 20);
    expect(postService.feed).not.toHaveBeenCalled();
    expect(container.querySelector(".empty-state")?.textContent).toContain("No favorites yet");
  });

  it("hides posts without media from the gallery", async () => {
    client.setQueryData(feedKey(), infinite([{ ...post, media: [], mediaCount: 0 }]));
    await renderPage();
    expect(container.querySelector(".gallery-card")).toBeNull();
    expect(container.querySelector(".empty-state")?.textContent).toContain("Nothing here yet");
  });

  it("shows an empty state when no posts are available", async () => {
    client.setQueryData(feedKey(), infinite([]));
    await renderPage();
    expect(container.querySelector(".empty-state")?.textContent).toContain("Nothing here yet");
    expect(container.querySelector(".gallery-card__media")).toBeNull();
  });

  it("shows loading then a retryable error from the regular feed endpoint", async () => {
    client.clear();
    let rejectFeed!: (reason: Error) => void;
    vi.mocked(postService.feed).mockImplementation(() => new Promise((_resolve, reject) => { rejectFeed = reject; }));
    await renderPage();
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Loading posts");
    expect(postService.feed).toHaveBeenCalledWith(0, 20);
    await act(async () => {
      rejectFeed(new Error("Feed unavailable"));
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(container.querySelector(".error-state__actions")).not.toBeNull();
    expect(button("Try again")).toBeDefined();
    expect(container.querySelector(".empty-state")).toBeNull();
  });

  it("localizes gallery copy", async () => {
    window.localStorage.setItem("shinigacim.language", "vi");
    await renderPage();
    expect(container.querySelector("h1")?.textContent).toBe("Ảnh.");
    expect(container.querySelector(".gallery-page__eyebrow")?.textContent).toBe("Thư viện");
  });
});
