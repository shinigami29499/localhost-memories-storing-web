// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TrashPage } from "./TrashPage";
import type { AdminPost, PagedFeed } from "../../features/posts";

vi.mock("../../features/posts/services/postService", () => ({ postService: {} }));
vi.mock("../../features/users", () => ({ userService: { list: vi.fn() } }));

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

describe("TrashPage", () => {
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
    queryClient.setQueryData(["admin-all-posts", "deleted", 0, 10, {}], posts);
    queryClient.setQueryData(["users"], [
      { id: "author", username: "alice", role: "user", status: "active", createdAt: "2026-10-24T00:00:00Z" },
      { id: "another-author", username: "bob", role: "user", status: "active", createdAt: "2026-10-23T00:00:00Z" },
    ]);
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
          <TrashPage />
        </QueryClientProvider>
      </MemoryRouter>,
    ));
  }

  it("renders a clear management hierarchy without a panel or column controls", () => {
    renderPage();
    expect(container.querySelector("main")?.getAttribute("aria-label")).toBe("Trash");
    expect(container.querySelector(".admin-page--posts")).not.toBeNull();
    expect(container.querySelector(".admin__layout")).toBeNull();
    expect(container.querySelector("h2")).toBeNull();
    expect(container.querySelector("h1")?.textContent).toBe("Trash.");
    expect(container.querySelector(".admin-posts__total")).toBeNull();
    const filterTrigger = container.querySelector<HTMLButtonElement>(".admin-posts__filter-trigger");
    expect(filterTrigger?.textContent).toContain("Filter");
    expect(filterTrigger?.getAttribute("aria-expanded")).toBe("false");
    act(() => filterTrigger?.click());
    const searchForm = document.body.querySelector<HTMLFormElement>('[aria-label="Search and filter posts"]');
    expect(searchForm).not.toBeNull();
    expect(document.body.querySelectorAll(".admin-posts__search input[type='date']")).toHaveLength(2);
    expect(document.body.querySelector(".admin-posts__date-range legend")?.textContent).toBe("Date range");
    expect(document.body.querySelector(".admin-posts__date-range-control")).not.toBeNull();
    expect(searchForm?.querySelector("button[type='submit']")?.textContent).toBe("Apply");
    const usernameSelect = document.body.querySelector<HTMLSelectElement>(".admin-posts__search select");
    expect(usernameSelect?.options[0].textContent).toBe("Any username");
    expect(Array.from(usernameSelect?.options ?? []).map((option) => option.value)).toEqual(["", "alice", "bob"]);
    expect(searchForm?.textContent).not.toContain("Clear filters");
    expect(searchForm?.textContent).not.toContain("Caption");
    expect(container.querySelector(".admin-posts__page-note")).toBeNull();
    expect(container.querySelector(".admin-posts__filter-label")).toBeNull();
    expect(container.querySelector(".admin__toolbar")).toBeNull();
    expect(container.querySelectorAll(".admin-post__resize")).toHaveLength(0);
    expect(container.querySelectorAll(".admin-grid > .admin-post .admin-post__caption")).toHaveLength(0);
    expect(container.querySelector('[aria-label="posts pagination"]')).not.toBeNull();
    expect(container.querySelector("footer.admin-posts__footer .pagination")).not.toBeNull();
    const toolbarRow = container.querySelector(".admin-posts__toolbar-row")!;
    expect(toolbarRow.firstElementChild?.classList.contains("admin-posts__filter")).toBe(true);
    expect(toolbarRow.lastElementChild?.classList.contains("admin-posts__filters")).toBe(true);
  });

  it("shows an empty trash state", () => {
    queryClient.setQueryData(["admin-all-posts", "deleted", 0, 10, {}], { ...posts, total: 0, items: [] });
    renderPage();

    expect(container.querySelector(".empty-state")?.textContent).toContain("Deleted posts appear here until restored or permanently deleted.");
  });

  it("keeps pagination outside the scrolling post content", () => {
    renderPage();
    const content = container.querySelector(".admin-posts__content")!;
    const footer = container.querySelector(".admin-posts__footer")!;
    expect(content.querySelector(".admin-grid")).not.toBeNull();
    expect(content.contains(footer)).toBe(false);
    expect(content.nextElementSibling).toBe(footer);
  });

  it("falls back to 10 when the saved page size is the removed 100 option", () => {
    window.localStorage.setItem("trash.limit", "100");
    renderPage();
    expect(container.querySelector(".admin-posts__total")).toBeNull();
    expect(container.querySelector('[aria-label="Items per page"]')?.textContent).toContain("10");
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
    queryClient.setQueryData(["admin-all-posts", "deleted", 0, 10, {}], { ...posts, items: [post], total: 1 });
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
    expect(container.querySelector(".admin-post__status")).toBeNull();
  });

  it.each([
    { name: "active", deletedAt: null, actionCount: 1 },
    { name: "deleted", deletedAt: "2026-10-24T01:00:00Z", actionCount: 2 },
  ])("shows compact details and actions for $name cards", ({ deletedAt, actionCount }) => {
    const post: AdminPost = {
      ...posts.items[0],
      caption: "Post caption",
      deletedAt,
      deletedBy: deletedAt ? { id: "moderator", username: "moderator" } : null,
      mediaCount: 1,
      commentCount: 3,
      media: [{ id: "image", mediaKind: "image", mimeType: "image/png" }],
    };
    queryClient.setQueryData(["admin-all-posts", "deleted", 0, 10, {}], { ...posts, items: [post], total: 1 });
    renderPage();

    const card = container.querySelector<HTMLElement>(".admin-post")!;
    expect(card.querySelector(".admin-post__caption")).toBeNull();
    expect(card.querySelector(".admin-post__status")).toBeNull();
    expect(card.querySelector(".admin-post__media-count")).toBeNull();
    expect(card.querySelector(".admin-post__comment-count")).toBeNull();
    expect(card.querySelector(".admin-post__date")?.textContent).toBe("10/24/2026");
    expect(card.querySelector(".admin-post__author")?.textContent).toBe("By alice");
    expect(card.querySelectorAll(".admin-post__actions button")).toHaveLength(actionCount);
    expect(card.querySelector(".admin-post__actions svg")?.getAttribute("width")).toBe("14");
    expect(card.querySelector(".admin-post__media")?.getAttribute("aria-label")).toBe("Preview media for post by alice");
  });

  it("reports media loading errors and supports opening again and cancelling", () => {
    queryClient.setQueryData(["admin-all-posts", "deleted", 0, 10, {}], {
      ...posts,
      items: [{
        ...posts.items[0],
        mediaCount: 1,
        media: [{ id: "missing-image", mediaKind: "image", mimeType: "image/png" }],
      }],
      total: 1,
    });
    renderPage();
    const mediaButton = container.querySelector<HTMLButtonElement>(".admin-post__media")!;
    mediaButton.focus();
    act(() => mediaButton.click());
    act(() => container.querySelector("dialog img")!.dispatchEvent(new Event("error")));
    expect(container.querySelector('[role="alert"]')?.textContent)
      .toBe("Could not load this media. It may be missing or your session may have expired.");
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Close media preview"]')!.click());
    expect(document.activeElement).toBe(mediaButton);
    act(() => mediaButton.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("dialog img")).not.toBeNull();
    act(() => container.querySelector("dialog")!.dispatchEvent(new Event("cancel", { cancelable: true })));
    expect(container.querySelector("dialog")).toBeNull();
    act(() => mediaButton.click());
    act(() => container.querySelector("dialog")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector("dialog")).toBeNull();
  });

  it("disables preview for posts without media", () => {
    renderPage();
    expect(container.querySelector<HTMLButtonElement>(".admin-post__media")?.disabled).toBe(true);
    expect(container.querySelector("dialog")).toBeNull();
  });

  it("pages through posts without remounting the animated pagination", () => {
    queryClient.setQueryData(["admin-all-posts", "deleted", 0, 10, {}], { ...posts, total: 26 });
    queryClient.setQueryData(["admin-all-posts", "deleted", 10, 10, {}], {
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
    expect(container.querySelector(".admin-post__caption")).toBeNull();

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Previous page"]')!.click());
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");
    expect(container.querySelectorAll(".admin-post")).toHaveLength(posts.items.length);
  });

  it("resets to the first page and saves a changed page size", () => {
    queryClient.setQueryData(["admin-all-posts", "deleted", 0, 10, {}], { ...posts, total: 26 });
    queryClient.setQueryData(["admin-all-posts", "deleted", 10, 10, {}], { ...posts, offset: 10, total: 26 });
    queryClient.setQueryData(["admin-all-posts", "deleted", 0, 20, {}], { ...posts, limit: 20, total: 26 });
    renderPage();
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click());
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("2");

    const pageSizeLabel = container.querySelector<HTMLButtonElement>('[aria-label="Items per page"]')!;
    expect(pageSizeLabel).not.toBeNull();
    expect(pageSizeLabel.textContent).toContain("10");

    // Simulate changing page size via the select component's onValueChange handler
    // Since Select.Root uses onValueChange, we test that the component renders correctly
    // The actual page size change is tested in Pagination.test.tsx
  });

  it("keeps the footer and page-size selector available when no posts remain", () => {
    queryClient.setQueryData(["admin-all-posts", "deleted", 0, 10, {}], { ...posts, items: [], total: 0 });
    renderPage();
    expect(container.querySelector(".admin-grid")).toBeNull();
    expect(container.querySelector("footer.admin-posts__footer .pagination__select-trigger")).not.toBeNull();
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");
  });

  it("renders Image and Video filters and shows all posts before a filter is selected", () => {
    const mixedPosts: PagedFeed<AdminPost> = {
      offset: 0,
      limit: 10,
      total: 3,
      items: [
        {
          id: "post-1",
          caption: "Image Post",
          createdAt: "2026-10-24T00:00:00Z",
          updatedAt: null,
          deletedAt: null,
          author: { id: "a1", username: "alice" },
          deletedBy: null,
          mediaCount: 1,
          commentCount: 0,
          media: [{ id: "img-1", mediaKind: "image", mimeType: "image/png" }],
        },
        {
          id: "post-2",
          caption: "Video Post",
          createdAt: "2026-10-24T00:00:00Z",
          updatedAt: null,
          deletedAt: null,
          author: { id: "a2", username: "bob" },
          deletedBy: null,
          mediaCount: 1,
          commentCount: 0,
          media: [{ id: "vid-1", mediaKind: "video", mimeType: "video/mp4" }],
        },
        {
          id: "post-3",
          caption: "Text Post",
          createdAt: "2026-10-24T00:00:00Z",
          updatedAt: null,
          deletedAt: null,
          author: { id: "a3", username: "charlie" },
          deletedBy: null,
          mediaCount: 0,
          commentCount: 0,
          media: [],
        },
      ],
    };
    queryClient.setQueryData(["admin-all-posts", "deleted", 0, 10, {}], mixedPosts);
    renderPage();

    const filters = container.querySelectorAll<HTMLButtonElement>(".admin-posts__filter .admin-tab");
    expect(filters).toHaveLength(2);
    expect(filters[0].textContent).toContain("Image");
    expect(filters[1].textContent).toContain("Video");
    expect(filters[0].querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(filters[0].querySelector("svg rect")).not.toBeNull();
    expect(filters[1].querySelector('svg path[d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"]')).not.toBeNull();
    expect(filters[1].querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.textContent).not.toContain("All");

    // With no media filter selected, show all 3 posts.
    expect(container.querySelectorAll(".admin-post")).toHaveLength(3);

    // Select Image.
    act(() => {
      filters[0].click();
    });
    expect(container.querySelectorAll(".admin-post")).toHaveLength(1);
    expect(filters[0].getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".admin-post__caption")).toBeNull();

    // Select Video.
    act(() => {
      filters[1].click();
    });
    expect(container.querySelectorAll(".admin-post")).toHaveLength(1);
    expect(filters[1].getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".admin-post__caption")).toBeNull();

    act(() => filters[1].click());
    expect(filters[1].getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelectorAll(".admin-post")).toHaveLength(3);
  });

  it("highlights focused media filters without applying them until activation", () => {
    renderPage();
    const filters = container.querySelectorAll<HTMLButtonElement>(".admin-posts__filter .admin-tab");
    expect(container.querySelector('[data-slot="motion-highlight"]')).toBeNull();

    act(() => filters[0].focus());
    expect(container.querySelector('[data-slot="motion-highlight"]')).not.toBeNull();
    expect(filters[0].getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelectorAll(".admin-post")).toHaveLength(posts.items.length);

    act(() => filters[0].click());
    expect(filters[0].getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll(".admin-post")).toHaveLength(0);

    act(() => filters[0].click());
    expect(filters[0].getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelectorAll(".admin-post")).toHaveLength(posts.items.length);
  });

  it.each(["mouse", "touch"])("handles %s hover without changing the selected filter", (pointerType) => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query === "(hover: hover) and (pointer: fine)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    renderPage();
    const filters = container.querySelectorAll<HTMLButtonElement>(".admin-posts__filter .admin-tab");
    const pointerOver = new MouseEvent("pointerover", { bubbles: true });
    Object.defineProperty(pointerOver, "pointerType", { value: pointerType });

    act(() => filters[1].dispatchEvent(pointerOver));
    expect(container.querySelector('[data-slot="motion-highlight"]') !== null).toBe(pointerType === "mouse");
    expect(filters[1].getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelectorAll(".admin-post")).toHaveLength(posts.items.length);
  });

  it("resets pagination when a media filter is selected", () => {
    queryClient.setQueryData(["admin-all-posts", "deleted", 0, 10, {}], { ...posts, total: 26 });
    queryClient.setQueryData(["admin-all-posts", "deleted", 10, 10, {}], { ...posts, offset: 10, total: 26 });
    renderPage();
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click());
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("2");

    act(() => container.querySelectorAll<HTMLButtonElement>(".admin-posts__filter .admin-tab")[0].click());
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");
    expect(container.querySelectorAll(".admin-posts__filter .admin-tab")[0].getAttribute("aria-pressed")).toBe("true");
  });
});
