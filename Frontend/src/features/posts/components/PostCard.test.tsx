// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostCard } from "./PostCard";
import { commentService } from "../services/postService";
import type { Post } from "../types";

vi.mock("@animate-ui/react/icons", () => ({
  AnimateIcon: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/animate-ui/icons/x", () => ({ X: () => null }));
vi.mock("../services/postService", () => ({
  commentService: { list: vi.fn() },
  postService: {},
  reactionService: {},
}));
vi.mock("../../../utils/media", () => ({ formatTimestamp: () => "" }));
vi.mock("./MediaGallery", () => ({ MediaGallery: () => null }));
vi.mock("./CommentSection", () => ({
  CommentSection: ({ postId }: { postId: string }) => <section>Comments for {postId}</section>,
}));
vi.mock("./ReactionControls", () => ({ ReactionControls: () => null }));
vi.mock("./CommentIcon", () => ({ CommentIcon: () => null }));
vi.mock("./DeletePostDialog", () => ({ DeletePostDialog: () => null }));
vi.mock("../../../store/authStore", () => ({
  useAuthStore: (selector: (state: { user: null }) => unknown) => selector({ user: null }),
}));
vi.mock("../../../context/LocaleContext", () => ({
  useLocale: () => ({
    language: "en",
    t: (value: string) => value,
  }),
}));

const post: Post = {
  id: "post-1",
  caption: "",
  createdAt: "2026-10-27T00:00:00Z",
  updatedAt: null,
  author: { id: "author-1", username: "alice" },
  commentCount: 1,
  reactionCounts: [],
  myReactionTypes: [],
  media: [],
};

describe("PostCard comments", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.mocked(commentService.list).mockResolvedValue([]);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps initially open comments expanded when locked", async () => {
    await act(async () => {
      root.render(
        <PostCard
          post={post}
          commentsLockedOpen
          initialCommentsOpen
          onChanged={() => {}}
          onDeleted={() => {}}
        />,
      );
    });

    const commentAction = container.querySelector<HTMLButtonElement>(".post-card__comment-action")!;
    expect(commentAction.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("Comments for post-1");

    expect(commentAction.disabled).toBe(true);

    await act(async () => commentAction.click());

    expect(commentAction.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("Comments for post-1");
  });

  it("keeps comments collapsed when not requested", async () => {
    await act(async () => {
      root.render(
        <PostCard
          post={post}
          onChanged={() => {}}
          onDeleted={() => {}}
        />,
      );
    });

    expect(container.querySelector(".post-card__comment-action")?.getAttribute("aria-expanded"))
      .toBe("false");
    expect(container.textContent).not.toContain("Comments for post-1");
  });
});
