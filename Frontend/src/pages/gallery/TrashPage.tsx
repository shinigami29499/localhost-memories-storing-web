import { AnimateIcon } from "@animate-ui/react/icons";
import { Highlight, HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { Popover } from "@animate-ui/react/primitives/base-ui/popover";
import { useEffect, useState, type FormEvent } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { DeletePostDialog, postService, type AdminPost, type AdminPostFilters, type PagedFeed } from "../../features/posts";
import { userService } from "../../features/users";
import { ApiError } from "../../services/api";
import { EmptyState, ErrorState, Spinner, showToast } from "../../components/ui";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { Clapperboard } from "@/components/animate-ui/icons/clapperboard";
import { Image } from "@/components/animate-ui/icons/image";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import { Pagination, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../components/ui/Pagination";
import { mediaUrl } from "../../utils/media";
import { AdminMediaPreview } from "../admin/AdminMediaPreview";
import type { PostTab } from "../../features/posts/hooks/useAdminPosts";
import "../admin/admin.css";
import { useLocale } from "../../context/LocaleContext";

const postTabs = [
  { value: "image", label: "Image", icon: Image },
  { value: "video", label: "Video", icon: Clapperboard },
] satisfies { value: PostTab; label: string; icon?: typeof Image }[];

interface PostFilterValues {
  username: string;
  createdFrom: string;
  createdTo: string;
}

const emptyPostFilterValues: PostFilterValues = {
  username: "",
  createdFrom: "",
  createdTo: "",
};

function localDateBoundary(value: string, nextDay = false): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (nextDay) date.setDate(date.getDate() + 1);
  return date.toISOString();
}

/** Admin-only gallery trash: soft-deleted posts with restore and permanent delete. */
export function TrashPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [previewPost, setPreviewPost] = useState<AdminPost | null>(null);
  const [deletePost, setDeletePost] = useState<AdminPost | null>(null);
  const [restorePost, setRestorePost] = useState<AdminPost | null>(null);
  const [tab, setTab] = useState<PostTab>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<PostFilterValues>(emptyPostFilterValues);
  const [activeFilters, setActiveFilters] = useState<AdminPostFilters>({});
  const [hoveredTab, setHoveredTab] = useState<PostTab | null>(null);
  const [focusedTab, setFocusedTab] = useState<PostTab | null>(null);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState<number>(() => {
    const stored = Number(window.localStorage.getItem("trash.limit"));
    return PAGE_SIZE_OPTIONS.some((size) => size === stored) ? stored : DEFAULT_PAGE_SIZE;
  });
  const page = Math.floor(offset / limit) + 1;

  const handlePageSizeChange = (newPageSize: number) => {
    setLimit(newPageSize);
    setOffset(0);
    window.localStorage.setItem("trash.limit", String(newPageSize));
  };

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);
  const queryKey = ["admin-all-posts", "deleted", offset, limit, activeFilters] as const;

  const posts = useQuery({
    queryKey,
    queryFn: () => postService.listAll(offset, limit, { ...activeFilters, status: "deleted" }),
    placeholderData: keepPreviousData,
  });
  const users = useQuery({
    queryKey: ["users"],
    queryFn: userService.list,
  });
  const usernames = Array.from(new Set(users.data?.map((user) => user.username) ?? [])).sort((a, b) => a.localeCompare(b));

  const filteredPosts = posts.data?.items.filter((post) => {
    if (tab === "all") return true;
    if (tab === "image") return post.media.some((media) => media.mediaKind === "image");
    if (tab === "video") return post.media.some((media) => media.mediaKind === "video");
    return true;
  }) ?? [];

  useEffect(() => {
    const totalPages = Math.ceil((posts.data?.total ?? 0) / limit);
    if (totalPages > 0 && page > totalPages) {
      setOffset((totalPages - 1) * limit);
    }
  }, [limit, page, posts.data?.total]);

  const copyRemoved = (id: string) => {
    void queryClient.setQueryData<PagedFeed<AdminPost>>(queryKey, (existing) =>
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
    onError: (err) => showToast.error(err instanceof ApiError ? err.message : t("Could not restore the post.")),
  });

  const isLoading = restore.isPending || deletePost !== null || restorePost !== null;

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFilters: AdminPostFilters = {};
    const username = filterValues.username.trim();
    if (username) nextFilters.username = username;
    if (filterValues.createdFrom) nextFilters.createdFrom = localDateBoundary(filterValues.createdFrom);
    if (filterValues.createdTo) nextFilters.createdBefore = localDateBoundary(filterValues.createdTo, true);
    setActiveFilters(nextFilters);
    setOffset(0);
    setFilterOpen(false);
  };

  return (
    <>
      <main className="admin-page admin-page--posts" aria-label={t("Trash")}>
        <div className="admin-posts__content">
        <header className="admin-posts__header">
          <div>
            <p className="admin-posts__eyebrow">{t("Gallery")}</p>
            <h1>{t("Trash")}<span className="brand__dot">.</span></h1>
            <p className="admin-posts__description">
              {t("Restore deleted posts or remove them permanently.")}
            </p>
          </div>
        </header>

        {posts.isLoading ?         <Spinner label={t("Loading posts…")} /> : null}
        {posts.isError ? (
          <ErrorState message={t("Could not load posts.")} onRetry={() => void posts.refetch()} />
        ) : null}

        <div className="admin-posts__toolbar">
          <div className="admin-posts__toolbar-row">
            <div className="admin-posts__filter">
              <Highlight
                mode="parent"
                controlledItems
                value={hoveredTab ?? focusedTab}
                click={false}
                className="admin-tab-highlight"
                containerClassName="admin-tabs-highlight"
                exitDelay={0}
              >
                <div
                  className="admin-tabs"
                  aria-label={t("Filter posts by media type")}
                  role="group"
                  onPointerLeave={() => setHoveredTab(null)}
                >
                  {postTabs.map(({ value, label, icon: Icon }) => (
                    <HighlightItem key={value} value={value} asChild>
                      <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                        <button
                          type="button"
                          className="admin-tab"
                          aria-pressed={tab === value}
                          data-active={tab === value ? "true" : undefined}
                          onClick={() => {
                            setTab(tab === value ? "all" : value);
                            setOffset(0);
                          }}
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
                        </button>
                      </AnimateIcon>
                    </HighlightItem>
                  ))}
                </div>
              </Highlight>
            </div>
            <div className="admin-posts__filters">
              <Popover.Root open={filterOpen} onOpenChange={setFilterOpen}>
                <Popover.Trigger type="button" className="admin-posts__filter-trigger">
                  <span>{t("Filter")}</span>
                  {hasActiveFilters ? <span className="admin-posts__applied">{t("Filters applied")}</span> : null}
                  <ChevronDown size={16} aria-hidden="true" />
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Positioner side="bottom" align="end" sideOffset={8} className="admin-posts__filter-positioner">
                    <Popover.Popup className="admin-posts__filter-popup">
                      <Popover.Title className="admin-posts__filter-title">{t("Filter")}</Popover.Title>
                      <form className="admin-posts__search" aria-label={t("Search and filter posts")} onSubmit={applyFilters}>
                        <label className="admin-posts__field admin-posts__field--username">
                          <span>{t("Username")}</span>
                          <select
                            value={filterValues.username}
                            disabled={users.isLoading || users.isError}
                            onChange={(event) => setFilterValues((current) => ({ ...current, username: event.target.value }))}
                          >
                            <option value="">{t("Any username")}</option>
                            {usernames.map((username) => <option key={username} value={username}>{username}</option>)}
                          </select>
                          {users.isLoading ? <span className="admin-posts__field-message" role="status">{t("Loading usernames…")}</span> : null}
                          {users.isError ? <span className="admin-posts__field-message admin-posts__field-message--error" role="alert">{t("Could not load usernames.")}</span> : null}
                        </label>
                        <fieldset className="admin-posts__date-range">
                          <legend>{t("Date range")}</legend>
                          <div className="admin-posts__date-range-control">
                            <label className="admin-posts__date-endpoint">
                              <span>{t("From")}</span>
                              <input
                                type="date"
                                max={filterValues.createdTo || undefined}
                                value={filterValues.createdFrom}
                                onChange={(event) => setFilterValues((current) => ({ ...current, createdFrom: event.target.value }))}
                              />
                            </label>
                            <span className="admin-posts__date-range-separator" aria-hidden="true">–</span>
                            <label className="admin-posts__date-endpoint">
                              <span>{t("To")}</span>
                              <input
                                type="date"
                                min={filterValues.createdFrom || undefined}
                                value={filterValues.createdTo}
                                onChange={(event) => setFilterValues((current) => ({ ...current, createdTo: event.target.value }))}
                              />
                            </label>
                          </div>
                        </fieldset>
                        <div className="admin-posts__search-actions">
                          <button className="btn btn--primary" type="submit">{t("Apply")}</button>
                        </div>
                      </form>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            </div>
          </div>
        </div>

        <PostsPanel
          posts={filteredPosts}
          isLoading={posts.isLoading}
          restore={restore}
          isLoadingGlobal={isLoading}
          setDeletePost={setDeletePost}
          setRestorePost={setRestorePost}
          setPreviewPost={setPreviewPost}
        />
        </div>

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
  restore: UseMutationResult<void, Error, string>;
  isLoadingGlobal: boolean;
  setDeletePost: (post: AdminPost | null) => void;
  setRestorePost: (post: AdminPost | null) => void;
  setPreviewPost: (post: AdminPost | null) => void;
}

function PostsPanel({
  posts,
  isLoading,
  restore,
  isLoadingGlobal,
  setDeletePost,
  setRestorePost,
  setPreviewPost,
}: PostsPanelProps) {
  const { t } = useLocale();

  if (isLoading) {
    return null;
  }

  if (posts.length === 0) {
    return (
      <EmptyState title={t("Trash is empty")} hint={t("Deleted posts appear here until restored or permanently deleted.")} />
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
          onRestore={() => setRestorePost(post)}
          onDelete={() => setDeletePost(post)}
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
          <span className="admin-post__author">{t("By {username}", { username: post.author.username })}</span>
          <span className="admin-post__date">{new Date(post.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}</span>
        </div>

        <div className="admin-post__footer">
          {post.deletedAt !== null ? (
            <p className="admin-post__deleted-info">
              {t("Deleted")} {new Date(post.deletedAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}
              {post.deletedBy ? ` ${t("By {username}", { username: post.deletedBy.username })}` : ""}
            </p>
          ) : null}
          <div className="admin-post__actions">
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
                  {isRestoring ? <LoaderCircle animate={false} className="btn__spinner" aria-hidden="true" /> : <RotateCcw size={14} aria-hidden="true" />}
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
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </AnimateIcon>
          </div>
        </div>
      </div>
    </article>
  );
}