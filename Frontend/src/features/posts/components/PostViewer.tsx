import { AnimateIcon } from "@animate-ui/react/icons";
import { useRef, useState } from "react";
import { ArrowLeft } from "@/components/animate-ui/icons/arrow-left";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import type { Post } from "../types";
import { showToast } from "../../../components/ui/Toast";
import { PostCard } from "./PostCard";
import { useLocale } from "../../../context/LocaleContext";

interface Props {
  posts: Post[];
  total: number;
  hasMore: boolean;
  loadMore: () => Promise<Post[]>;
  onChanged: (post: Post) => void;
  onDeleted: (id: string) => void;
}

export function PostViewer({ posts, total, hasMore, loadMore, onChanged, onDeleted }: Props) {
  const { t } = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
  const index = Math.max(0, posts.findIndex((post) => post.id === selectedId));
  const post = posts[index];

  const previous = () => {
    if (pending.current || index === 0) return;
    setSelectedId(posts[index - 1].id);
  };

  const next = async () => {
    if (pending.current) return;
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
        showToast.error(t("Could not load the next post."));
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
          <span className="post-viewer__eyebrow">{t("One moment at a time")}</span>
          <p className="post-viewer__position" role="status">
            {post ? t("Post {current} of {total}", { current: index + 1, total }) : t("More moments to explore")}
          </p>
        </div>
        <div className="post-viewer__navigation" aria-label={t("Post navigation")}>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="viewer-icon-btn"
              aria-label={t("Previous post")}
              title={t("Previous post")}
              disabled={index === 0 || loading}
              onClick={previous}
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="viewer-icon-btn"
              aria-label={t(loading ? "Loading next post" : "Next post")}
              title={t("Next post")}
              disabled={(index === posts.length - 1 && !hasMore) || loading}
              onClick={() => void next()}
            >
              {loading ? <LoaderCircle animate={false} className="spinner__wheel" aria-hidden="true" /> : <ArrowRight size={20} aria-hidden="true" />}
            </button>
          </AnimateIcon>
        </div>
      </div>
      <p className="post-viewer__hint" id="post-viewer-hint">
        {t("Use the arrows, swipe, or tap the image edges for previous/next, or the center to zoom. Multi-photo posts navigate photos; single-image posts navigate moments.")}
      </p>
      <div
        className="post-viewer__stage"
        role="region"
        aria-label={t("Post viewer")}
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
        ) : <p>{t("Use the next arrow to load more posts.")}</p>}
      </div>
    </div>
  );
}
