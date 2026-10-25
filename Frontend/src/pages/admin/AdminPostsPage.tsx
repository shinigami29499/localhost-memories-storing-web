import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { postService } from "../../services/postService";
import { ApiError } from "../../services/api";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Status";
import { ArrowLeft, Eye, LoaderCircle, RotateCcw, Trash2, ChevronFirst, ChevronLast } from "lucide-react";
import { DeletePostDialog } from "../../components/feed/DeletePostDialog";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import { Pagination, DEFAULT_PAGE_SIZE } from "../../components/ui/Pagination";
import { mediaUrl } from "../../utils/media";
import type { AdminPost, PagedFeed } from "../../types";
import { AdminMediaPreview } from "./AdminMediaPreview";
import "./admin.css";

export function AdminPostsPage() {
  const queryClient = useQueryClient();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<AdminPost | null>(null);
  const [deletePost, setDeletePost] = useState<AdminPost | null>(null);
  const [restorePost, setRestorePost] = useState<AdminPost | null>(null);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState<number>(() => {
    const stored = Number(window.localStorage.getItem("admin-posts.limit"));
    return [10, 20, 50, 100].includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  });
  const page = Math.floor(offset / limit) + 1;
  const [columns, setColumns] = useState<number>(() => {
    const stored = Number(window.localStorage.getItem("admin-posts.columns"));
    return Number.isInteger(stored) && stored >= 1 && stored <= 6 ? stored : 3;
  });

  const handlePageSizeChange = (newPageSize: number) => {
    setLimit(newPageSize);
    setOffset(0);
    window.localStorage.setItem("admin-posts.limit", String(newPageSize));
  };

  const changeColumns = (next: number) => {
    const clamped = Math.min(6, Math.max(1, next));
    setColumns(clamped);
    window.localStorage.setItem("admin-posts.columns", String(clamped));
  };

  const posts = useQuery({
    queryKey: ["admin-all-posts", offset, limit],
    queryFn: () => postService.listAll(offset, limit),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    const totalPages = Math.ceil((posts.data?.total ?? 0) / limit);
    if (totalPages > 0 && page > totalPages) {
      setOffset((totalPages - 1) * limit);
    }
  }, [limit, page, posts.data?.total]);

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
            <span className="admin__toolbar-label" id="admin-columns-label">Columns</span>
            <div className="admin__stepper" role="group" aria-labelledby="admin-columns-label">
              <button
                type="button"
                className="btn btn--secondary admin-step-btn"
                disabled={columns === 1}
                aria-label="Fewer columns"
                title="Fewer columns"
                onClick={() => changeColumns(columns - 1)}
              >
                <ChevronFirst size={16} aria-hidden="true" />
              </button>
              <span className="admin__stepper-value" aria-live="polite">{columns} per row</span>
              <button
                type="button"
                className="btn btn--secondary admin-step-btn"
                disabled={columns === 6}
                aria-label="More columns"
                title="More columns"
                onClick={() => changeColumns(columns + 1)}
              >
                <ChevronLast size={16} aria-hidden="true" />
              </button>
            </div>
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
            <>
              <div
                ref={gridRef}
                className="admin-grid"
                style={{
                  "--admin-grid-template": Array(columns).fill("minmax(0, 1fr)").join(" "),
                } as CSSProperties}
              >
                {posts.data.items.map((post, index) => (
                  <AdminPostCard
                    key={post.id}
                    post={post}
                    onPreview={() => setPreviewPost(post)}
                    isLoading={restore.isPending || deletePost !== null || restorePost !== null}
                    isRestoring={restore.isPending && restore.variables === post.id}
                    onRestore={() => { setError(null); setRestorePost(post); }}
                    onDelete={() => { setError(null); setDeletePost(post); }}
                    showResizeHandle={index < columns - 1}
                  />
                ))}
              </div>
              <Pagination
                page={page}
                pageSize={limit}
                total={posts.data.total}
                itemLabel="posts"
                isFetching={posts.isFetching}
                onPageChange={(nextPage) => setOffset((nextPage - 1) * limit)}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
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
  showResizeHandle: boolean;
}

function AdminPostCard({
  post, onPreview, isLoading, isRestoring, onRestore, onDelete, showResizeHandle,
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
        {showResizeHandle ? <span className="admin-post__resize" aria-hidden="true" /> : null}
      </div>
    </article>
  );
}
