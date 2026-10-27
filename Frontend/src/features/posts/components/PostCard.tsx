import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { X } from "@/components/animate-ui/icons/x";
import { AnimateIcon } from "@animate-ui/react/icons";
import { AutoHeight } from "@animate-ui/react/primitives/effects/auto-height";
import type { Comment, Post } from "../types";
import { commentService, postService, reactionService } from "../services/postService";
import { formatTimestamp } from "../../../utils/media";
import { MediaGallery } from "./MediaGallery";
import { CommentSection } from "./CommentSection";
import { ReactionControls, type ReactionType } from "./ReactionControls";
import { CommentIcon } from "./CommentIcon";
import { DeletePostDialog } from "./DeletePostDialog";
import { useAuthStore } from "../../../store/authStore";
import { useLocale } from "../../../context/LocaleContext";

interface Props {
  post: Post;
  /** Whenever post data changes the parent should replace the card. */
  onChanged: (updated: Post) => void;
  onDeleted: (postId: string) => void;
  commentsLockedOpen?: boolean;
  initialCommentsOpen?: boolean;
  onCommentClick?: () => void;
  onPreviousPost?: () => void;
  onNextPost?: () => void;
}

/** One feed card: media, caption, author, reactions, comments, owner actions. */
export function PostCard({
  post,
  onChanged,
  onDeleted,
  commentsLockedOpen = false,
  initialCommentsOpen = false,
  onCommentClick,
  onPreviousPost,
  onNextPost,
}: Props) {
  const { language, t } = useLocale();
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.role?.toLowerCase() === "admin";
  const isAuthor = post.author.id === me?.id;

  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(commentsLockedOpen || initialCommentsOpen);
  const [reactionBusy, setReactionBusy] = useState(false);
  const reactionPending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadComments = useCallback(async () => {
    if (!showComments) return;
    try {
      setComments(await commentService.list(post.id));
    } catch {
      setError(t("Could not load comments."));
    }
  }, [post.id, showComments]);

  // Split caption into visible and overflow parts based on character thresholds
  const { visiblePart, overflowPart, shouldShowToggle } = useMemo(() => {
    if (!post.caption) return { visiblePart: "", overflowPart: "", shouldShowToggle: false };

    // Mobile: 125-150 chars (approx 135), Desktop: 400-480 chars (approx 440)
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
    const threshold = isMobile ? 135 : 440;

    if (post.caption.length <= threshold) {
      return { visiblePart: post.caption, overflowPart: "", shouldShowToggle: false };
    }

    // Split at word boundary near threshold
    let splitIndex = threshold;
    const lastSpace = post.caption.lastIndexOf(" ", threshold);
    if (lastSpace > threshold - 30) {
      splitIndex = lastSpace;
    }

    return {
      visiblePart: post.caption.slice(0, splitIndex),
      overflowPart: post.caption.slice(splitIndex),
      shouldShowToggle: true,
    };
  }, [post.caption]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const toggleReaction = async (type: ReactionType) => {
    if (reactionPending.current) return;
    reactionPending.current = true;
    setReactionBusy(true);
    setError(null);
    try {
      const isRemoving = post.myReactionTypes.includes(type);
      let updated = post;
      // Publish each successful request so a partial switch failure stays in sync with the server.
      for (const previous of post.myReactionTypes) {
        const reactionCounts = await reactionService.remove(post.id, previous);
        updated = { ...updated, reactionCounts, myReactionTypes: updated.myReactionTypes.filter((value) => value !== previous) };
        onChanged(updated);
      }
      if (!isRemoving) {
        const reactionCounts = await reactionService.add(post.id, type);
        onChanged({ ...updated, reactionCounts, myReactionTypes: [type] });
      }
    } catch {
      setError(t("Reaction failed. Please retry."));
    } finally {
      reactionPending.current = false;
      setReactionBusy(false);
    }
  };

  return (
    <article className="post-card">
      <header className="post-card__header">
        <div className="post-card__author">
          <span className="post-card__avatar" aria-hidden>
            {post.author.username.charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="post-card__username">{post.author.username}</div>
            <time className="post-card__time" dateTime={post.createdAt}>
              {formatTimestamp(post.createdAt, language)}
              {post.updatedAt ? ` Ã‚Â· ${t("edited")}` : ""}
            </time>
          </div>
        </div>
        {isAdmin || isAuthor ? (
          <div className="post-card__actions">
              <AnimateIcon animateOnHover animateOnTap completeOnStop completeOnStop asChild>
                <button
                  type="button"
                  className="btn btn--ghost post-card__delete"
                  onClick={() => setConfirmingDelete(true)}
                  aria-label={t("Delete post")}
                  title={t("Delete post")}
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </AnimateIcon>
          </div>
        ) : null}
      </header>
      {confirmingDelete ? (
        <DeletePostDialog
          postId={post.id}
          allowPermanentDelete={isAdmin}
          onClose={() => setConfirmingDelete(false)}
          onDeleted={onDeleted}
        />
      ) : null}

      {post.caption ? (
        <AutoHeight
          deps={[expanded]}
          className="post-card__caption-wrapper"
        >
          <p className="post-card__caption">
            <span>{expanded || !shouldShowToggle ? post.caption : visiblePart}</span>
            {!expanded && shouldShowToggle ? (
              <>
                {"... "}
                <button
                  type="button"
                  className="post-card__toggle-btn"
                  aria-expanded={false}
                  onClick={() => setExpanded(true)}
                >
                  {t("Show more")}
                </button>
              </>
            ) : null}
            {expanded && shouldShowToggle ? (
              <>
                {" "}
                <button
                  type="button"
                  className="post-card__toggle-btn"
                  aria-expanded={true}
                  onClick={() => setExpanded(false)}
                >
                  {t("Show less")}
                </button>
              </>
            ) : null}
          </p>
        </AutoHeight>
      ) : null}

      <MediaGallery media={post.media} onPreviousPost={onPreviousPost} onNextPost={onNextPost} />

      {error ? <p className="post-card__error" role="alert">{error}</p> : null}

      <div className="post-card__footer">
        <ReactionControls
          counts={post.reactionCounts}
          mine={post.myReactionTypes}
          onToggle={toggleReaction}
          busy={reactionBusy}
        />
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <button
            type="button"
            className="post-card__comment-action"
            disabled={commentsLockedOpen}
            onClick={() => {
              if (commentsLockedOpen) return;
              if (onCommentClick) {
                onCommentClick();
              } else {
                setShowComments((visible) => !visible);
              }
            }}
            aria-expanded={commentsLockedOpen ? true : onCommentClick ? undefined : showComments}
            aria-label={t(
              commentsLockedOpen
                ? "View {count} comments"
                : onCommentClick
                  ? "View {count} comments"
                  : showComments
                    ? "Hide {count} comments"
                    : "Show {count} comments",
              { count: post.commentCount },
            )}
            title={t(
              commentsLockedOpen
                ? "Comments"
                : onCommentClick
                  ? "View comments"
                  : showComments
                    ? "Hide comments"
                    : "Show comments",
            )}
          >
            <CommentIcon />
            <span>{post.commentCount}</span>
          </button>
        </AnimateIcon>
      </div>

      {showComments ? (
        <CommentSection
          postId={post.id}
          comments={comments}
          reload={loadComments}
          onAdded={(created) => {
            setComments((prev) => [...prev, created]);
            onChanged({ ...post, commentCount: post.commentCount + 1 });
          }}
        />
      ) : null}
    </article>
  );
}
