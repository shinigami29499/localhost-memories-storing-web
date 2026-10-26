// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPostsPage } from "./AdminPostsPage";
import type { AdminPost, PagedFeed } from "../../features/posts";

vi.mock("../../features/posts/services/postService", () => ({ postService: {} }));

const posts: PagedFeed<AdminPost> = {
  offset: 0,
  limit: 10,
  total: 6,
  items: Array.from({ length: 6 }, (_, index) => ({
    id: `post-${index}`,
    caption: `Post ${index}`,
    createdAt: "2026-10-24T00:00:00Z",
    updatedAt: null,
    deletedAt: null,
    author: { id: "author", username: "alice" },
    deletedBy: null,
    mediaCount: 0,
    commentCount: 0,
    media: [],
  })),
};

describe("AdminPostsPage", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeAll(() => {
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
  });

  afterAll(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  });

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })));
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    queryClient.setQueryData(["admin-all-posts", 0, 10], posts);
  });

  afterEach(() => {
    act(() => root.unmount());
    queryClient.clear();
    container.remove();
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function renderPage() {
    act(() => root.render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <QueryClientProvider client={queryClient}>
          <AdminPostsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    ));
  }

  it("renders posts in order without an enclosing panel, heading, or column controls", () => {
    renderPage();
    expect(container.querySelector("main")?.getAttribute("aria-label")).toBe("Post management");
    expect(container.querySelector(".admin-page--posts")).not.toBeNull();
    expect(container.querySelector(".admin__layout")).toBeNull();
    expect(container.querySelector("h2")).toBeNull();
    expect(container.querySelector(".admin__toolbar")).toBeNull();
    expect(container.querySelectorAll(".admin-post__resize")).toHaveLength(0);
    expect(Array.from(container.querySelectorAll(".admin-grid > .admin-post .admin-post__caption"),
      (caption) => caption.textContent)).toEqual(posts.items.map((post) => post.caption));
    expect(container.querySelector(".admin__back")?.getAttribute("href")).toBe("/");
    expect(container.querySelector('[aria-label="posts pagination"]')).not.toBeNull();
  });

  it.each([
    null, "1", "3", "6", "invalid",
  ])("uses automatic wrapping regardless of the obsolete column setting %s", (value) => {
    if (value !== null) window.localStorage.setItem("admin-posts.columns", value);
    renderPage();
    expect(container.querySelector(".admin-grid")?.getAttribute("style")).toBeNull();
    expect(container.querySelector('[aria-label="More columns"]')).toBeNull();
    expect(container.querySelector('[aria-label="Fewer columns"]')).toBeNull();
    expect(container.querySelectorAll(".admin-post")).toHaveLength(posts.items.length);
  });

  it.each([
    { name: "active", deletedAt: null },
    { name: "deleted", deletedAt: "2026-10-24T01:00:00Z" },
  ])("previews all media for $name posts without restoring them", ({ deletedAt }) => {
    const post: AdminPost = {
      ...posts.items[0],
      deletedAt,
      mediaCount: 2,
      media: [
        { id: "image-1", mediaKind: "image", mimeType: "image/png" },
        { id: "video-2", mediaKind: "video", mimeType: "video/mp4" },
      ],
    };
    queryClient.setQueryData(["admin-all-posts", 0, 10], { ...posts, items: [post], total: 1 });
    renderPage();
    const thumbnail = container.querySelector<HTMLImageElement>(".admin-post__media img");
    expect(thumbnail?.src).toContain("/api/media/image-1/file?");
    expect(thumbnail?.src).toContain("includeDeleted=true");
    act(() => container.querySelector<HTMLButtonElement>(".admin-post__media")!.click());

    const dialog = container.querySelector<HTMLDialogElement>("dialog")!;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute("aria-label")).toBe("Media preview for post by alice");
    expect(dialog.textContent).toContain("Media 1 of 2");
    expect(dialog.textContent?.includes("Preview from trash")).toBe(deletedAt !== null);
    expect(dialog.querySelector("img")?.src).toContain("/api/media/image-1/file?");
    expect(dialog.querySelector("img")?.src).toContain("includeDeleted=true");
    expect(dialog.querySelector<HTMLButtonElement>('[aria-label="Previous media"]')?.disabled).toBe(true);

    act(() => dialog.querySelector<HTMLButtonElement>('[aria-label="Next media"]')!.click());
    expect(dialog.querySelector("img")).toBeNull();
    expect(dialog.querySelector("video")?.src).toContain("/api/media/video-2/file?");
    expect(dialog.querySelector("video")?.controls).toBe(true);
    expect(dialog.textContent).toContain("Media 2 of 2");
    expect(dialog.querySelector<HTMLButtonElement>('[aria-label="Next media"]')?.disabled).toBe(true);

    act(() => dialog.querySelector<HTMLButtonElement>('[aria-label="Previous media"]')!.click());
    expect(dialog.querySelector("video")).toBeNull();
    expect(dialog.querySelector("img")?.src).toContain("/api/media/image-1/file?");
    act(() => dialog.querySelector<HTMLButtonElement>('[aria-label="Close media preview"]')!.click());
    expect(container.querySelector("dialog")).toBeNull();
    expect(container.querySelector(".admin-post__status")?.textContent).toBe(deletedAt ? "Deleted" : "Active");
  });

  it("reports media loading errors and supports opening again and cancelling", () => {
    queryClient.setQueryData(["admin-all-posts", 0, 10], {
      ...posts,
      items: [{
        ...posts.items[0],
        mediaCount: 1,
        media: [{ id: "missing-image", mediaKind: "image", mimeType: "image/png" }],
      }],
      total: 1,
    });
    renderPage();
    const previewButton = container.querySelector<HTMLButtonElement>('[aria-label="Open media preview for post by alice"]')!;
    previewButton.focus();
    act(() => previewButton.click());
    act(() => container.querySelector("dialog img")!.dispatchEvent(new Event("error")));
    expect(container.querySelector('[role="alert"]')?.textContent)
      .toBe("Could not load this media. It may be missing or your session may have expired.");
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Close media preview"]')!.click());
    expect(document.activeElement).toBe(previewButton);
    act(() => previewButton.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("dialog img")).not.toBeNull();
    act(() => container.querySelector("dialog")!.dispatchEvent(new Event("cancel", { cancelable: true })));
    expect(container.querySelector("dialog")).toBeNull();
    act(() => previewButton.click());
    act(() => container.querySelector("dialog")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector("dialog")).toBeNull();
  });

  it("disables preview for posts without media", () => {
    renderPage();
    expect(container.querySelector<HTMLButtonElement>(".admin-post__media")?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Open media preview for post by alice"]')?.disabled).toBe(true);
    expect(container.querySelector("dialog")).toBeNull();
  });

  it("pages through posts without remounting the animated pagination", () => {
    queryClient.setQueryData(["admin-all-posts", 0, 10], { ...posts, total: 26 });
    queryClient.setQueryData(["admin-all-posts", 10, 10], {
      ...posts,
      offset: 10,
      total: 26,
      items: [{ ...posts.items[0], id: "page-two-post", caption: "Second page post" }],
    });
    renderPage();

    const pagination = container.querySelector('[aria-label="posts pagination"]');
    expect(pagination?.hasAttribute("data-animate-ui-pagination")).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Previous page"]')?.disabled).toBe(true);

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click());

    expect(container.querySelector('[aria-label="posts pagination"]')).toBe(pagination);
    expect(container.querySelector('[aria-current="page"]')?.getAttribute("aria-label")).toBe("Page 2");
    expect(container.querySelector(".admin-post__caption")?.textContent).toBe("Second page post");

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Previous page"]')!.click());
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");
    expect(container.querySelectorAll(".admin-post")).toHaveLength(posts.items.length);
  });

  it("resets to the first page and saves a changed page size", () => {
    queryClient.setQueryData(["admin-all-posts", 0, 10], { ...posts, total: 26 });
    queryClient.setQueryData(["admin-all-posts", 10, 10], { ...posts, offset: 10, total: 26 });
    queryClient.setQueryData(["admin-all-posts", 0, 20], { ...posts, limit: 20, total: 26 });
    renderPage();
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click());
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("2");

    const select = container.querySelector<HTMLSelectElement>(".pagination__page-size select")!;
    act(() => {
      select.value = "20";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(window.localStorage.getItem("admin-posts.limit")).toBe("20");
    expect(select.value).toBe("20");
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");
    expect(container.querySelectorAll('[data-slot="pagination-link"]')).toHaveLength(2);
  });
});
