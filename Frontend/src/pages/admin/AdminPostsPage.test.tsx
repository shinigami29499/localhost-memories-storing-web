// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPostsPage } from "./AdminPostsPage";
import type { AdminPost, PagedFeed } from "../../types";

vi.mock("../../services/postService", () => ({ postService: {} }));

const posts: PagedFeed<AdminPost> = {
  offset: 0,
  limit: 50,
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
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    queryClient.setQueryData(["admin-all-posts"], posts);
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

  function expectColumns(count: number) {
    expect(container.querySelector(".admin__stepper-value")?.textContent).toBe(`${count} per row`);
    const grid = container.querySelector<HTMLElement>(".admin-grid");
    expect(grid?.style.getPropertyValue("--admin-grid-template"))
      .toBe(Array(count).fill("minmax(0, 1fr)").join(" "));
    expect(container.querySelectorAll(".admin-post__resize")).toHaveLength(count - 1);
  }

  it.each([1, 2, 3, 4, 5, 6])("applies saved column count %i on entry", (count) => {
    window.localStorage.setItem("admin-posts.columns", String(count));
    renderPage();
    expectColumns(count);
  });

  it.each([
    { name: "missing", value: null },
    { name: "non-numeric", value: "invalid" },
    { name: "below minimum", value: "0" },
    { name: "above maximum", value: "7" },
    { name: "fractional", value: "2.5" },
  ])("uses three columns for $name saved settings", ({ value }) => {
    if (value !== null) window.localStorage.setItem("admin-posts.columns", value);
    renderPage();
    expectColumns(3);
  });

  it("keeps valid widths when changing columns and reopening the page", () => {
    window.localStorage.setItem("admin-posts.columns", "4");
    renderPage();
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="More columns"]')!.click());
    expectColumns(5);
    expect(window.localStorage.getItem("admin-posts.columns")).toBe("5");

    act(() => root.unmount());
    root = createRoot(container);
    renderPage();
    expectColumns(5);

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Fewer columns"]')!.click());
    expectColumns(4);
    expect(window.localStorage.getItem("admin-posts.columns")).toBe("4");
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
    queryClient.setQueryData(["admin-all-posts"], { ...posts, items: [post], total: 1 });
    renderPage();
    const thumbnail = container.querySelector<HTMLImageElement>(".admin-post__media img");
    expect(thumbnail?.src).toContain("/api/Media/image-1/file?");
    expect(thumbnail?.src).toContain("includeDeleted=true");
    act(() => container.querySelector<HTMLButtonElement>(".admin-post__media")!.click());

    const dialog = container.querySelector<HTMLDialogElement>("dialog")!;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute("aria-label")).toBe("Media preview for post by alice");
    expect(dialog.textContent).toContain("Media 1 of 2");
    expect(dialog.textContent?.includes("Preview from trash")).toBe(deletedAt !== null);
    expect(dialog.querySelector("img")?.src).toContain("/api/Media/image-1/file?");
    expect(dialog.querySelector("img")?.src).toContain("includeDeleted=true");
    expect(dialog.querySelector<HTMLButtonElement>('[aria-label="Previous media"]')?.disabled).toBe(true);

    act(() => dialog.querySelector<HTMLButtonElement>('[aria-label="Next media"]')!.click());
    expect(dialog.querySelector("img")).toBeNull();
    expect(dialog.querySelector("video")?.src).toContain("/api/Media/video-2/file?");
    expect(dialog.querySelector("video")?.controls).toBe(true);
    expect(dialog.textContent).toContain("Media 2 of 2");
    expect(dialog.querySelector<HTMLButtonElement>('[aria-label="Next media"]')?.disabled).toBe(true);

    act(() => dialog.querySelector<HTMLButtonElement>('[aria-label="Previous media"]')!.click());
    expect(dialog.querySelector("video")).toBeNull();
    expect(dialog.querySelector("img")?.src).toContain("/api/Media/image-1/file?");
    act(() => dialog.querySelector<HTMLButtonElement>('[aria-label="Close media preview"]')!.click());
    expect(container.querySelector("dialog")).toBeNull();
    expect(container.querySelector(".admin-post__status")?.textContent).toBe(deletedAt ? "Deleted" : "Active");
  });

  it("reports media loading errors and supports opening again and cancelling", () => {
    queryClient.setQueryData(["admin-all-posts"], {
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
});
