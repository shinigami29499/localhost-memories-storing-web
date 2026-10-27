// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";
import { postService } from "../../features/posts/services/postService";
import type { Post } from "../../features/posts/types";

vi.mock("../../features/posts/services/postService", () => ({
  postService: { feed: vi.fn() },
}));
vi.mock("../../components/layout/CommunityIntro", () => ({
  CommunityIntro: () => null,
}));
vi.mock("../../features/posts/components/NewPostForm", () => ({
  NewPostForm: ({ onSubmitted }: { onSubmitted: () => void }) => (
    <button onClick={onSubmitted}>Create post</button>
  ),
}));
vi.mock("../../features/posts/components/PostCard", () => ({
  PostCard: ({ post, onChanged, onDeleted, onCommentClick }: {
    post: Post;
    onChanged: (post: Post) => void;
    onDeleted: (id: string) => void;
    onCommentClick?: () => void;
  }) => (
    <article>
      <p>{post.caption}</p>
      <button onClick={() => onChanged({ ...post, caption: "Updated post" })}>Edit {post.id}</button>
      <button onClick={() => onDeleted(post.id)}>Delete {post.id}</button>
      {onCommentClick ? <button onClick={onCommentClick}>Open comments {post.id}</button> : null}
    </article>
  ),
}));

function CurrentPath() {
  const { pathname } = useLocation();
  return <output data-testid="current-path">{pathname}</output>;
}

function makePosts(count: number): Post[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `post-${index}`,
    caption: `Post ${index}`,
    createdAt: "2026-10-26T00:00:00Z",
    updatedAt: null,
    author: { id: "author", username: "alice" },
    media: [],
    commentCount: 0,
    reactionCounts: [],
    myReactionTypes: [],
  }));
}

describe("HomePage infinite feed", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;
  let posts: Post[];
  let observerCallback: IntersectionObserverCallback;
  let observer: IntersectionObserver;
  const disconnect = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
        observer = this;
      }
      root = null;
      rootMargin = "0px";
      thresholds = [0];
      observe() {}
      unobserve() {}
      takeRecords() { return []; }
      disconnect = disconnect;
    });
    posts = makePosts(12);
    vi.mocked(postService.feed).mockImplementation(async (offset = 0, limit = 10) => ({
      items: posts.slice(offset, offset + limit),
      total: posts.length,
      offset,
      limit,
    }));
    window.localStorage.setItem("feed.pageSize", "100");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    act(() => root.unmount());
    queryClient.clear();
    container.remove();
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  async function settle(assertion: () => void) {
    await vi.waitFor(async () => {
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
      assertion();
    });
  }

  async function renderPage() {
    await act(async () => root.render(
      <MemoryRouter>
        <CurrentPath />
        <QueryClientProvider client={queryClient}><HomePage /></QueryClientProvider>
      </MemoryRouter>,
    ));
  }

  async function reachEnd() {
    const target = container.querySelector(".post-list__sentinel")!;
    await act(async () => observerCallback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry], observer,
    ));
  }

  async function click(label: string) {
    const button = Array.from(container.querySelectorAll("button"))
      .find((element) => element.textContent === label)!;
    await act(async () => button.click());
  }

  it("loads and appends batches of 5, ignores the old page size, and announces the end", async () => {
    await renderPage();
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(5));
    expect(postService.feed).toHaveBeenCalledWith(0, 5);
    expect(container.querySelector("select")).toBeNull();
    expect(container.querySelector("nav")).toBeNull();
    expect(container.textContent).not.toContain("No more posts");

    await reachEnd();
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(10));
    await reachEnd();
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(12));
    expect(vi.mocked(postService.feed).mock.calls).toEqual([[0, 5], [5, 5], [10, 5]]);
    expect(Array.from(container.querySelectorAll("article > p"), (node) => node.textContent))
      .toEqual(posts.map((post) => post.caption));
    expect(container.querySelector('[role="status"]')?.textContent).toBe("No more posts to show.");
    expect(disconnect).toHaveBeenCalled();
  });

  it("opens a post detail page from the feed comment action", async () => {
    await renderPage();
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(5));

    await click("Open comments post-0");

    expect(container.querySelector('[data-testid="current-path"]')?.textContent).toBe("/posts/post-0");
  });

  it("keeps loaded posts during the next request and does not request another batch while fetching", async () => {
    await renderPage();
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(5));
    let resolvePage!: (value: Awaited<ReturnType<typeof postService.feed>>) => void;
    vi.mocked(postService.feed).mockImplementationOnce(() => new Promise((resolve) => { resolvePage = resolve; }));
    await reachEnd();
    await settle(() => expect(container.textContent).toContain("Loading..."));
    expect(container.querySelectorAll("article")).toHaveLength(5);
    expect(postService.feed).toHaveBeenCalledTimes(2);
    await act(async () => resolvePage({ items: posts.slice(5, 10), offset: 5, limit: 5, total: 12 }));
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(10));
  });

  it.each([1, 5, 10])("stops without an extra request when the feed has %i posts", async (count) => {
    posts = makePosts(count);
    await renderPage();
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(Math.min(count, 5)));
    if (count > 5) await reachEnd();
    await settle(() => expect(container.textContent).toContain("No more posts to show."));
    expect(container.querySelectorAll("article")).toHaveLength(count);
    expect(postService.feed).toHaveBeenCalledTimes(Math.ceil(count / 5));
  });

  it("does not load another batch until the end enters the viewport", async () => {
    await renderPage();
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(5));
    await act(async () => observerCallback(
      [{ isIntersecting: false, target: container.querySelector(".post-list__sentinel")! } as IntersectionObserverEntry],
      observer,
    ));
    expect(postService.feed).toHaveBeenCalledTimes(1);
  });

  it("keeps posts on a batch error and retries the same offset only on request", async () => {
    await renderPage();
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(5));
    vi.mocked(postService.feed).mockRejectedValueOnce(new Error("Offline"));
    await reachEnd();
    await settle(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
    expect(container.querySelectorAll("article")).toHaveLength(5);
    expect(container.textContent).not.toContain("No more posts");
    expect(postService.feed).toHaveBeenCalledTimes(2);
    await click("Try again");
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(10));
    expect(vi.mocked(postService.feed).mock.calls).toEqual([[0, 5], [5, 5], [5, 5]]);
  });

  it("shows an initial error with retry instead of an empty or end state", async () => {
    vi.mocked(postService.feed).mockRejectedValueOnce(new Error("Offline"));
    await renderPage();
    await settle(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
    expect(container.textContent).not.toContain("Nothing here yet");
    expect(container.textContent).not.toContain("No more posts");
    await click("Try again");
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(5));
  });

  it("shows one empty state for an empty feed", async () => {
    posts = [];
    await renderPage();
    await settle(() => expect(container.textContent).toContain("Nothing here yet"));
    expect(container.querySelectorAll(".empty-state")).toHaveLength(1);
    expect(container.querySelector(".post-list__sentinel")).toBeNull();
    expect(postService.feed).toHaveBeenCalledTimes(1);
  });

  it("stops on an empty batch even if the server total is stale", async () => {
    await renderPage();
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(5));
    vi.mocked(postService.feed).mockResolvedValueOnce({ items: [], total: 12, offset: 5, limit: 5 });
    await reachEnd();
    await settle(() => expect(container.textContent).toContain("No more posts to show."));
    expect(postService.feed).toHaveBeenCalledTimes(2);
  });

  it("updates posts in later batches and refreshes offsets after deletion and creation", async () => {
    await renderPage();
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(5));
    await reachEnd();
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(10));
    await click("Edit post-7");
    await settle(() => expect(container.textContent).toContain("Updated post"));

    posts = posts.filter((post) => post.id !== "post-2");
    await click("Delete post-2");
    await settle(() => expect(container.querySelectorAll("article > p")[9]?.textContent).toBe("Post 10"));
    expect(container.textContent).not.toContain("Delete post-2");
    await reachEnd();
    await settle(() => expect(container.querySelectorAll("article")).toHaveLength(11));
    expect(container.textContent).toContain("No more posts to show.");

    posts = [{ ...posts[0], id: "new-post", caption: "New post" }, ...posts];
    await click("Create post");
    await settle(() => expect(container.querySelector("article > p")?.textContent).toBe("New post"));
    expect(container.querySelectorAll("article")).toHaveLength(12);
  });
});
