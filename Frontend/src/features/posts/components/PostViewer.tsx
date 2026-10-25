import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import type { Post } from "../types";
import { ErrorState } from "../../../components/ui/Status";
import { PostCard } from "./PostCard";

interface Props {
  posts: Post[];
  total: number;
  hasMore: boolean;
  loadMore: () => Promise<Post[]>;
  onChanged: (post: Post) => void;
  onDeleted: (id: string) => void;
}

export function PostViewer({ posts, total, hasMore, loadMore, onChanged, onDeleted }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(false);
  const index = Math.max(0, posts.findIndex((post) => post.id === selectedId));
  const post = posts[index];

  const previous = () => {
    if (pending.current || index === 0) return;
    setError(false);
    setSelectedId(posts[index - 1].id);
  };

  const next = async () => {
    if (pending.current) return;
    setError(false);
    if (index < posts.length - 1) {
      setSelectedId(posts[index + 1].id);
    } else if (hasMore) {
      pending.current = true;
      setLoading(true);
      try {
        const updated = await loadMore();
        const currentIndex = post ? updated.findIndex((item) => item.id === post.id) : -1;
        const following = updated[currentIndex + 1];
        if (following) setSelectedId(following.id);
      } catch {
        setError(true);
      } finally {
        pending.current = false;
        setLoading(false);
      }
    }
  };

  if (!post && !hasMore) return null;

  return (
    <div className="post-viewer">
      <div className="post-viewer__toolbar">
        <div>
          <span className="post-viewer__eyebrow">One moment at a time</span>
          <p className="post-viewer__position" role="status">
            {post ? `Post ${index + 1} of ${total}` : "More moments to explore"}
          </p>
        </div>
        <div className="post-viewer__navigation" aria-label="Post navigation">
          <button
            type="button"
            className="viewer-icon-btn"
            aria-label="Previous post"
            title="Previous post"
            disabled={index === 0 || loading}
            onClick={previous}
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="viewer-icon-btn"
            aria-label={loading ? "Loading next post" : "Next post"}
            title="Next post"
            disabled={(index === posts.length - 1 && !hasMore) || loading}
            onClick={() => void next()}
          >
            {loading ? <LoaderCircle className="spinner__wheel" aria-hidden="true" /> : <ArrowRight size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <p className="post-viewer__hint" id="post-viewer-hint">
        Use the arrows or click the image edges for previous/next, or the center to zoom.
        Multi-photo posts navigate photos; single-image posts navigate moments.
      </p>
      <div
        className="post-viewer__stage"
        role="region"
        aria-label="Post viewer"
        aria-roledescription="carousel"
        aria-describedby="post-viewer-hint"
        aria-busy={loading}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            if (event.key === "ArrowLeft") previous();
            else void next();
          }
        }}
      >
        {post ? (
          <PostCard
            key={post.id}
            post={post}
            onChanged={onChanged}
            onPreviousPost={previous}
            onNextPost={() => void next()}
            onDeleted={(id) => {
              setSelectedId((posts[index + 1] ?? posts[index - 1])?.id ?? null);
              onDeleted(id);
            }}
          />
        ) : <p>Use the next arrow to load more posts.</p>}
      </div>
      {error ? <ErrorState message="Could not load the next post." onRetry={() => void next()} /> : null}
    </div>
  );
}
