import { AnimateIcon } from "@animate-ui/react/icons";
import { Tabs } from "@animate-ui/react/primitives/base-ui/tabs";
import { Highlight, HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeletePostDialog, postService, type AdminPost, type PagedFeed } from "../../features/posts";
import { ApiError } from "../../services/api";
import { EmptyState, ErrorState, Spinner, showToast } from "../../components/ui";
import { Eye } from "@/components/animate-ui/icons/eye";
import { Clapperboard } from "@/components/animate-ui/icons/clapperboard";
import { Image } from "@/components/animate-ui/icons/image";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import { Pagination, DEFAULT_PAGE_SIZE } from "../../components/ui/Pagination";
import { mediaUrl } from "../../utils/media";
import { AdminMediaPreview } from "./AdminMediaPreview";
import type { PostTab } from "../../features/posts/hooks/useAdminPosts";
import "./admin.css";
import { useLocale } from "../../context/LocaleContext";

const postTabs = [
  { value: "all", label: "All" },
  { value: "image", label: "Image", icon: Image },
  { value: "video", label: "Video", icon: Clapperboard },
] satisfies { value: PostTab; label: string; icon?: typeof Image }[];

export function AdminPostsPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<AdminPost | null>(null);
  const [deletePost, setDeletePost] = useState<AdminPost | null>(null);
  const [restorePost, setRestorePost] = useState<AdminPost | null>(null);
  const [tab, setTab] = useState<PostTab>("all");
  const [hoveredTab, setHoveredTab] = useState<PostTab | null>(null);
  const [focusedTab, setFocusedTab] = useState<PostTab | null>(null);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState<number>(() => {
    const stored = Number(window.localStorage.getItem("admin-posts.limit"));
    return [10, 20, 50, 100].includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  });
  const page = Math.floor(offset / limit) + 1;

  const handlePageSizeChange = (newPageSize: number) => {
    setLimit(newPageSize);
    setOffset(0);
    window.localStorage.setItem("admin-posts.limit", String(newPageSize));
  };

  const posts = useQuery({
    queryKey: ["admin-all-posts", offset, limit],
    queryFn: () => postService.listAll(offset, limit),
    placeholderData: keepPreviousData,
  });

  const filteredPosts = posts.data?.items.filter((post) => {
    if (tab === "all") return true;
    if (tab === "image") return post.media.some((m) => m.mediaKind === "image");
    if (tab === "video") return post.media.some((m) => m.mediaKind === "video");
    return true;
  }) ?? [];

  useEffect(() => {
    const totalPages = Math.ceil((posts.data?.total ?? 0) / limit);
    if (totalPages > 0 && page > totalPages) {
      setOffset((totalPages - 1) * limit);
    }
  }, [limit, page, posts.data?.total]);

  const copyRemoved = (id: string) => {
    void queryClient.setQueryData<PagedFeed<AdminPost>>(["admin-all-posts", offset, limit], (existing) =>
      existing ? { ...existing, items: existing.items.filter((post) => post.id !== id) } : existing,
    );
    void queryClient.invalidateQueries({ queryKey: ["admin-all-posts"] });
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const restore = useMutation({
    mutationFn: (postId: string) => postService.restore(postId),
    onSuccess: (_data, postId) => {
      showToast.success(t("Post restored successfully"));
      copyRemoved(postId);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not restore the post."),
  });

  const isLoading = restore.isPending || deletePost !== null || restorePost !== null;

  return (
    <>
      <main className="admin-page admin-page--posts" aria-label={t("Post management")}>
        <header className="admin-posts__header">
          <div>
            <p className="admin-posts__eyebrow">{t("Content moderation")}</p>
            <h1>{t("Manage posts")}<span className="brand__dot">.</span></h1>
            <p className="admin-posts__description">
              {t("Review community posts and moderation actions.")}
            </p>
          </div>
          <div className="admin-posts__total" aria-live="polite">
            <strong>{posts.data?.total ?? "—"}</strong>
            <span>{t("Posts")}</span>
          </div>
        </header>

        {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

        {posts.isLoading ?         <Spinner label={t("Loading posts…")} /> : null}
        {posts.isError ? (
          <ErrorState message={t("Could not load posts.")} onRetry={() => void posts.refetch()} />
        ) : null}

        <Tabs.Root value={tab} onValueChange={(value) => {
          if (value === "all" || value === "image" || value === "video") {
            setTab(value);
            setOffset(0);
          }
        }}>
          <div className="admin-posts__toolbar">
            <div className="admin-posts__filter">
              <span className="admin-posts__filter-label">{t("Filter by media")}</span>
              <Highlight
                mode="parent"
                controlledItems
                value={hoveredTab ?? focusedTab}
                click={false}
                className="admin-tab-highlight"
                containerClassName="admin-tabs-highlight"
                exitDelay={0}
              >
                <Tabs.List
                  className="admin-tabs"
                  aria-label={t("Filter posts by media type")}
                  onPointerLeave={() => setHoveredTab(null)}
                >
                  {postTabs.map(({ value, label, icon: Icon }) => (
                    <HighlightItem key={value} value={value} asChild>
                      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                        <Tabs.Tab
                          value={value}
                          className="admin-tab"
                          onPointerEnter={(event) => {
                            if (event.pointerType !== "touch" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                              setHoveredTab(value);
                            }
                          }}
                          onFocus={() => setFocusedTab(value)}
                          onBlur={() => setFocusedTab(null)}
                        >
                          {Icon ? <Icon size={16} aria-hidden="true" /> : null}
                          {t(label)}
                        </Tabs.Tab>
                      </AnimateIcon>
                    </HighlightItem>
                  ))}
                  <Tabs.Indicator className="admin-tab-indicator" />
                </Tabs.List>
              </Highlight>
            </div>
            {posts.data ? (
              <p className="admin-posts__page-note" aria-live="polite">
                {t("Showing {count} posts on this page", { count: filteredPosts.length })}
              </p>
            ) : null}
          </div>

          <Tabs.Panel value="all">
            <PostsPanel
              posts={filteredPosts}
              isLoading={posts.isLoading}
              restore={restore}
              isLoadingGlobal={isLoading}
              setError={setError}
              setDeletePost={setDeletePost}
              setRestorePost={setRestorePost}
              setPreviewPost={setPreviewPost}
            />
          </Tabs.Panel>
          <Tabs.Panel value="image">
            <PostsPanel
              posts={filteredPosts}
              isLoading={posts.isLoading}
              restore={restore}
              isLoadingGlobal={isLoading}
              setError={setError}
              setDeletePost={setDeletePost}
              setRestorePost={setRestorePost}
              setPreviewPost={setPreviewPost}
            />
          </Tabs.Panel>
          <Tabs.Panel value="video">
            <PostsPanel
              posts={filteredPosts}
              isLoading={posts.isLoading}
              restore={restore}
              isLoadingGlobal={isLoading}
              setError={setError}
              setDeletePost={setDeletePost}
              setRestorePost={setRestorePost}
              setPreviewPost={setPreviewPost}
            />
          </Tabs.Panel>
        </Tabs.Root>

        {posts.data ? (
          <footer className="admin-posts__footer" aria-label={t("Post pagination controls")}>
            <Pagination
              page={page}
              pageSize={limit}
              total={posts.data.total}
              itemLabel="posts"
              isFetching={posts.isFetching}
              onPageChange={(nextPage) => setOffset((nextPage - 1) * limit)}
              onPageSizeChange={handlePageSizeChange}
            />
          </footer>
        ) : null}
      </main>
      {previewPost ? (
        <AdminMediaPreview key={previewPost.id} post={previewPost} onClose={() => setPreviewPost(null)} />
      ) : null}
      {deletePost ? (
        <DeletePostDialog
          key={deletePost.id}
          postId={deletePost.id}
          isDeleted={deletePost.deletedAt !== null}
          onClose={() => setDeletePost(null)}
          onDeleted={copyRemoved}
        />
      ) : null}
      {restorePost ? (
        <ConfirmationDialog
          title={t("Restore this post?")}
          onClose={() => setRestorePost(null)}
          onConfirm={async () => { await restore.mutateAsync(restorePost.id); }}
        >
          <p>{t("Restore the post by {username} and its media from trash? It will be visible in the feed again.", { username: restorePost.author.username })}</p>
        </ConfirmationDialog>
      ) : null}
    </>
  );
}

interface PostsPanelProps {
  posts: AdminPost[];
  isLoading: boolean;
  restore: ReturnType<typeof useMutation>;
  isLoadingGlobal: boolean;
  setError: (error: string | null) => void;
  setDeletePost: (post: AdminPost | null) => void;
  setRestorePost: (post: AdminPost | null) => void;
  setPreviewPost: (post: AdminPost | null) => void;
}

function PostsPanel({
  posts,
  isLoading,
  restore,
  isLoadingGlobal,
  setError,
  setDeletePost,
  setRestorePost,
  setPreviewPost,
}: PostsPanelProps) {
  if (isLoading) {
    return null;
  }

  if (posts.length === 0) {
    return (
      <EmptyState title="No posts" hint="Every post, active or deleted, appears here for review." />
    );
  }

  return (
    <div className="admin-grid">
      {posts.map((post) => (
        <AdminPostCard
          key={post.id}
          post={post}
          onPreview={() => setPreviewPost(post)}
          isLoading={isLoadingGlobal}
          isRestoring={restore.isPending && restore.variables === post.id}
          onRestore={() => { setError(null); setRestorePost(post); }}
          onDelete={() => { setError(null); setDeletePost(post); }}
        />
      ))}
    </div>
  );
}

interface AdminPostCardProps {
  post: AdminPost;
  onPreview: () => void;
  isLoading: boolean;
  isRestoring: boolean;
  onRestore: () => void;
  onDelete: () => void;
}

function AdminPostCard({
  post, onPreview, isLoading, isRestoring, onRestore, onDelete,
}: AdminPostCardProps) {
  const { language, t } = useLocale();
  const isDeleted = post.deletedAt !== null;

  return (
    <article className={`admin-post${isDeleted ? " admin-post--deleted" : ""}`}>

      <button
        type="button"
        className="admin-post__media"
        disabled={post.media.length === 0}
        aria-label={t("Preview media for post by {username}", { username: post.author.username })}
        title={t("Preview media")}
        onClick={onPreview}
      >
        {post.media.length === 0 ? (
          <span className="admin-post__placeholder">{t("No media")}</span>
        ) : post.media[0].mediaKind === "video" ? (
          <video src={mediaUrl(post.media[0].id, true)} preload="metadata" muted aria-hidden="true" />
        ) : (
          <img src={mediaUrl(post.media[0].id, true)} alt="" loading="lazy" />
        )}
        {post.mediaCount > 1 ? <span className="admin-post__more">+{post.mediaCount - 1}</span> : null}
      </button>

      <div className="admin-post__body">
        <div className="admin-post__topline">
          {isDeleted ? (
            <span className="admin-post__status admin-post__status--deleted">
              {t("Deleted")}
            </span>
          ) : null}
          <span className="admin-post__date">{new Date(post.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}</span>
        </div>

        <p className="admin-post__caption" title={post.caption}>{post.caption}</p>

        <div className="admin-post__meta">
          <span className="admin-post__author">{t("By {username}", { username: post.author.username })}</span>
          <span className="admin-post__media-count">{t("{count} media", { count: post.mediaCount })}</span>
          <span className="admin-post__comment-count">{t("{count} comments", { count: post.commentCount })}</span>
        </div>

        {post.deletedAt !== null ? (
          <p className="admin-post__deleted-info">
            {t("Deleted")} {new Date(post.deletedAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}
            {post.deletedBy ? ` ${t("By {username}", { username: post.deletedBy.username })}` : ""}
          </p>
        ) : null}

        <div className="admin-post__actions">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="btn btn--secondary admin-icon-btn"
              disabled={post.media.length === 0 || isLoading}
              aria-label={t("Open media preview for post by {username}", { username: post.author.username })}
              title={t("Preview media")}
              onClick={onPreview}
            >
              <Eye size={18} aria-hidden="true" />
            </button>
          </AnimateIcon>
          {isDeleted ? (
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button
                type="button"
                className="btn btn--primary admin-icon-btn"
                disabled={isLoading}
                aria-busy={isRestoring || undefined}
                aria-label={t("Restore post by {username}", { username: post.author.username })}
                title={t("Restore post")}
                onClick={onRestore}
              >
                {isRestoring ? <LoaderCircle animate={false} className="btn__spinner" aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
              </button>
            </AnimateIcon>
          ) : null}
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="btn btn--danger admin-icon-btn"
              disabled={isLoading}
              aria-label={t("Delete post by {username}", { username: post.author.username })}
              title={t("Delete post")}
              onClick={onDelete}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </AnimateIcon>
        </div>
      </div>
    </article>
  );
}