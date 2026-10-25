import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { postService } from "../../services/postService";
import { ApiError } from "../../services/api";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Status";
import { ArrowLeft, ChevronFirst, ChevronLast, Eye, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { DeletePostDialog } from "../../components/feed/DeletePostDialog";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import { mediaUrl } from "../../utils/media";
import type { AdminPost, PagedFeed } from "../../types";
import { AdminMediaPreview } from "./AdminMediaPreview";
import "./admin.css";

const PAGE_LIMIT = 50; // Max page size (configurable in settings, default: 20)
const ITEMS_PER_PAGE_DEFAULT = 20; // Default items per page

export function AdminPostsPage() {
  const queryClient = useQueryClient();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<AdminPost | null>(null);
  const [deletePost, setDeletePost] = useState<AdminPost | null>(null);
  const [restorePost, setRestorePost] = useState<AdminPost | null>(null);
  /** Pagination state */
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState<number>(() => {
    const stored = Number(window.localStorage.getItem("admin-posts.limit"));
    return Number.isInteger(stored) && stored > 0 ? Math.min(PAGE_LIMIT, stored) : ITEMS_PER_PAGE_DEFAULT;
  });

  /** Change page size (items per page), limited to PAGE_LIMIT */
  const changeLimit = (next: number) => {
    const clamped = Math.min(PAGE_LIMIT, Math.max(ITEMS_PER_PAGE_DEFAULT, next));
    setLimit(clamped);
    window.localStorage.setItem("admin-posts.limit", String(clamped));
  };

  const posts = useQuery({
    queryKey: ["admin-all-posts", offset, limit],
    queryFn: () => postService.listAll(offset, limit),
  });

  /** Calculate total pages */
  const totalPages = Math.ceil((posts.data?.total || 0) / limit);

  /** Pagination handlers */
  const nextPage = () => {
    if (posts.data?.total && offset + limit < posts.data.total) setOffset(offset + limit);
  };

  const prevPage = () => {
    if (offset > 0) setOffset(offset - limit);
  };

  const firstPage = () => setOffset(0);

  const lastPage = () => setOffset((totalPages - 1) * limit);

  const copyRemoved = (id: string) => {
    void queryClient.setQueryData<PagedFeed<AdminPost>>(["admin-all-posts"], (existing) =>
      existing ? { ...existing, items: existing.items.filter((post) => post.id !== id) } : existing,
    );
    void queryClient.invalidateQueries({ queryKey: ["admin-all-posts"] });
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const restore = useMutation({
    mutationFn: (postId: string) => postService.restore(postId),
    onSuccess: (_data, postId) => copyRemoved(postId),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not restore the post."),
  });

  return (
    <>
      <main className="admin-page">
        <div className="admin__layout">
          <div className="admin__heading">
            <h2>Manage posts<span className="brand__dot">.</span></h2>
            <Link to="/" className="admin__back"><ArrowLeft size={16} aria-hidden="true" /> Back to feed</Link>
          </div>

          <div className="admin__toolbar">
            <span className="admin__toolbar-label" id="admin-limit-label">Items per page</span>
            <div className="admin__stepper" role="group" aria-labelledby="admin-limit-label">
              <button
                type="button"
                className="btn btn--secondary admin-step-btn"
                disabled={limit === ITEMS_PER_PAGE_DEFAULT}
                aria-label="Smaller items per page"
                title="Fewer items per page"
                onClick={() => changeLimit(limit - 5)}
              >
                <ChevronFirst size={16} aria-hidden="true" />
              </button>
              <span className="admin__stepper-value" aria-live="polite">{limit}</span>
              <button
                type="button"
                className="btn btn--secondary admin-step-btn"
                disabled={limit === PAGE_LIMIT}
                aria-label="Larger items per page"
                title="More items per page"
                onClick={() => changeLimit(limit + 5)}
              >
                <ChevronLast size={16} aria-hidden="true" />
              </button>
            </div>

            {/* Pagination controls */}
            <div className="admin__pagination-wrap" style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
              <span className="admin__page-label">Page</span>
              <button
                type="button"
                className="btn btn--secondary admin-page-btn"
                disabled={offset === 0}
                aria-label="Go to first page"
                onClick={firstPage}
              >
                <ChevronFirst size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn btn--secondary admin-page-btn"
                disabled={posts.data?.total ? offset + limit >= posts.data.total : false}
                aria-label="Go to last page"
                onClick={lastPage}
              >
                <ChevronLast size={14} aria-hidden="true" />
              </button>
              {totalPages > 1 && (
                <>
                  <span className="admin__page-info">
                    <strong>{Math.floor(offset / limit) + 1}</strong> of <strong>{totalPages}</strong> pages
                  </span>
                  <button
                    type="button"
                    className="btn btn--secondary admin-page-btn"
                    disabled={offset === 0}
                    aria-label="Previous page"
                    onClick={prevPage}
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary admin-page-btn"
                    disabled={posts.data?.total ? offset + limit >= posts.data.total : false}
                    aria-label="Next page"
                    onClick={nextPage}
                  >
                    Next →
                  </button>
                </>
              )}
            </div>

            <span className="admin__toolbar-hint">Show {limit} items, {posts.data?.items.length || 0} posts loaded</span>
          </div>

          {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

          {posts.isLoading ? <Spinner label="Loading posts…" /> : null}
          {posts.isError ? (
            <ErrorState message="Could not load posts." onRetry={() => void posts.refetch()} />
          ) : null}

          {!posts.isLoading && !posts.isError && posts.data?.items.length === 0 ? (
            <EmptyState title="No posts" hint="Every post, active or deleted, appears here for review." />
          ) : null}

          {posts.data && posts.data.items.length > 0 ? (
            <div
              ref={gridRef}
              className="admin-grid"
            >
              {posts.data.items.map((post) => (
                <AdminPostCard
                  key={post.id}
                  post={post}
                  onPreview={() => setPreviewPost(post)}
                  isLoading={restore.isPending || deletePost !== null || restorePost !== null}
                  isRestoring={restore.isPending && restore.variables === post.id}
                  onRestore={() => { setError(null); setRestorePost(post); }}
                  onDelete={() => { setError(null); setDeletePost(post); }}
                />
              ))}
            </div>
          ) : null}
        </div>
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
          title="Restore this post?"
          onClose={() => setRestorePost(null)}
          onConfirm={async () => { await restore.mutateAsync(restorePost.id); }}
        >
          <p>Restore the post by {restorePost.author.username} and its media from trash? It will be visible in the feed again.</p>
        </ConfirmationDialog>
      ) : null}
    </>
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
  const isDeleted = post.deletedAt !== null;

  return (
    <article className={`admin-post${isDeleted ? " admin-post--deleted" : ""}`}>

      <button
        type="button"
        className="admin-post__media"
        disabled={post.media.length === 0}
        aria-label={`Preview media for post by ${post.author.username}`}
        title="Preview media"
        onClick={onPreview}
      >
        {post.media.length === 0 ? (
          <span className="admin-post__placeholder">No media</span>
        ) : post.media[0].mediaKind === "video" ? (
          <video src={mediaUrl(post.media[0].id, true)} preload="metadata" muted aria-hidden="true" />
        ) : (
          <img src={mediaUrl(post.media[0].id, true)} alt="" loading="lazy" />
        )}
        {post.mediaCount > 1 ? <span className="admin-post__more">+{post.mediaCount - 1}</span> : null}
      </button>

      <div className="admin-post__body">
        <div className="admin-post__topline">
          <span className={isDeleted ? "admin-post__status admin-post__status--deleted" : "admin-post__status"}>
            {isDeleted ? "Deleted" : "Active"}
          </span>
          <span className="admin-post__date">{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>

        <p className="admin-post__caption" title={post.caption}>{post.caption}</p>

        <div className="admin-post__meta">
          <span>By {post.author.username}</span>
          <span>{post.mediaCount} media</span>
          <span>{post.commentCount} comments</span>
        </div>

        {post.deletedAt !== null ? (
          <p className="admin-post__deleted-info">
            Deleted {new Date(post.deletedAt).toLocaleDateString()}
            {post.deletedBy ? ` by ${post.deletedBy.username}` : ""}
          </p>
        ) : null}

        <div className="admin-post__actions">
          <button
            type="button"
            className="btn btn--secondary admin-icon-btn"
            disabled={post.media.length === 0 || isLoading}
            aria-label={`Open media preview for post by ${post.author.username}`}
            title="Preview media"
            onClick={onPreview}
          >
            <Eye size={18} aria-hidden="true" />
          </button>
          {isDeleted ? (
            <button
              type="button"
              className="btn btn--primary admin-icon-btn"
              disabled={isLoading}
              aria-busy={isRestoring || undefined}
              aria-label={`Restore post by ${post.author.username}`}
              title="Restore post"
              onClick={onRestore}
            >
              {isRestoring ? <LoaderCircle className="btn__spinner" aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--danger admin-icon-btn"
            disabled={isLoading}
            aria-label={`Delete post by ${post.author.username}`}
            title="Delete post"
            onClick={onDelete}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
