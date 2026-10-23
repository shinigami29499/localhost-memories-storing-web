import { useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { postService } from "../../services/postService";
import { ApiError } from "../../services/api";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Status";
import { ArrowLeft, Eye, LoaderCircle, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { DeletePostDialog } from "../../components/feed/DeletePostDialog";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import { mediaUrl } from "../../utils/media";
import type { AdminPost, PagedFeed } from "../../types";
import { AdminMediaPreview } from "./AdminMediaPreview";
import "./admin.css";

const PAGE_LIMIT = 50;
const DEFAULT_COLUMNS = 3;
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 6;
/** Floor for a single column width, in fr units, so a card always stays usable. */
const MIN_FRACTION = 0.35;
const COLUMNS_STORAGE_KEY = "admin-posts.columns";

export function AdminPostsPage() {
  const queryClient = useQueryClient();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<AdminPost | null>(null);
  const [deletePost, setDeletePost] = useState<AdminPost | null>(null);
  const [restorePost, setRestorePost] = useState<AdminPost | null>(null);
  const [columns, setColumns] = useState<number>(() => {
    const stored = Number(window.localStorage.getItem(COLUMNS_STORAGE_KEY));
    return Number.isInteger(stored) && stored >= MIN_COLUMNS && stored <= MAX_COLUMNS
      ? stored
      : DEFAULT_COLUMNS;
  });
  /** Per-column widths for drag resizing, in fr units; reset whenever the column count changes. */
  const [fractions, setFractions] = useState<number[]>(() => Array(columns).fill(1));

  const posts = useQuery({
    queryKey: ["admin-all-posts"],
    queryFn: () => postService.listAll(0, PAGE_LIMIT),
  });

  const changeColumns = (next: number) => {
    const clamped = Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, next));
    setColumns(clamped);
    setFractions(Array(clamped).fill(1));
    window.localStorage.setItem(COLUMNS_STORAGE_KEY, String(clamped));
  };

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

  const resizeColumns = (index: number, deltaX: number) => {
    const width = gridRef.current?.offsetWidth;
    if (!width || index >= fractions.length - 1) return;
    setFractions((prev) => {
      // One handle step equals that pixel shift converted to the current fr scale.
      const deltaFr = (deltaX / width) * columns;
      const left = Math.max(MIN_FRACTION, prev[index] + deltaFr);
      const right = Math.max(MIN_FRACTION, prev[index + 1] - deltaFr);
      if (left === prev[index] && right === prev[index + 1]) return prev;
      const next = [...prev];
      next[index] = left;
      next[index + 1] = right;
      return next;
    });
  };

  const template = fractions.map((fraction) => `minmax(0, ${fraction}fr)`).join(" ");

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
                disabled={columns === MIN_COLUMNS}
                aria-label="Fewer columns"
                title="Fewer columns"
                onClick={() => changeColumns(columns - 1)}
              >
                <Minus size={18} aria-hidden="true" />
              </button>
              <span className="admin__stepper-value" aria-live="polite">{columns} per row</span>
              <button
                type="button"
                className="btn btn--secondary admin-step-btn"
                disabled={columns === MAX_COLUMNS}
                aria-label="More columns"
                title="More columns"
                onClick={() => changeColumns(columns + 1)}
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
            <span className="admin__toolbar-hint">Drag column edges to resize.</span>
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
              style={{ "--admin-grid-template": template } as CSSProperties}
            >
              {posts.data.items.map((post, index) => (
                <AdminPostCard
                  key={post.id}
                  post={post}
                  showHandle={index < columns - 1}
                  onHandleDrag={(deltaX) => resizeColumns(index, deltaX)}
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
  /** True when this card owns a resize handle for the gap to its next column. */
  showHandle: boolean;
  onHandleDrag: (deltaX: number) => void;
  onPreview: () => void;
  /** Any action in flight disables the card's buttons. */
  isLoading: boolean;
  /** Per-action flags keep the spinner on the exact card and button that started it. */
  isRestoring: boolean;
  onRestore: () => void;
  onDelete: () => void;
}

function AdminPostCard({
  post, showHandle, onHandleDrag, onPreview, isLoading, isRestoring, onRestore, onDelete,
}: AdminPostCardProps) {
  const isDeleted = post.deletedAt !== null;

  return (
    <article className={`admin-post${isDeleted ? " admin-post--deleted" : ""}`}>
      {showHandle ? <ColumnResizeHandle onDrag={onHandleDrag} /> : null}

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

/** Invisible drag strip covering the gap between a card and its right-hand neighbour. */
function ColumnResizeHandle({ onDrag }: { onDrag: (deltaX: number) => void }) {
  const drag = useRef<{ startX: number } | null>(null);

  const stop = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.current = null;
  };

  return (
    <div
      role="separator"
      aria-hidden="true"
      className="admin-post__resize"
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { startX: event.clientX };
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        onDrag(event.clientX - drag.current.startX);
        drag.current.startX = event.clientX;
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
    />
  );
}
