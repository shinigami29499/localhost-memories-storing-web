import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Comment, Post } from "../types";
import { commentService, postService, reactionService } from "../services/postService";
import { formatTimestamp } from "../../../utils/media";
import { MediaGallery } from "./MediaGallery";
import { CommentSection } from "./CommentSection";
import { REACTION_TYPES, ReactionControls, type ReactionType } from "./ReactionControls";
import { ReactionIcon } from "./ReactionIcon";
import { DeletePostDialog } from "./DeletePostDialog";
import { useAuthStore } from "../../../store/authStore";

interface Props {
  post: Post;
  /** Whenever post data changes the parent should replace the card. */
  onChanged: (updated: Post) => void;
  onDeleted: (postId: string) => void;
  onPreviousPost?: () => void;
  onNextPost?: () => void;
}

/** One feed card: media, caption, author, reactions, comments, owner actions. */
export function PostCard({ post, onChanged, onDeleted, onPreviousPost, onNextPost }: Props) {
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.role?.toLowerCase() === "admin";

  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [reactionBusy, setReactionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const loadComments = useCallback(async () => {
    if (!showComments) return;
    try {
      setComments(await commentService.list(post.id));
    } catch {
      setError("Could not load comments.");
    }
  }, [post.id, showComments]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const toggleReaction = async (type: ReactionType) => {
    setReactionBusy(true);
    setError(null);
    try {
      await reactionService[post.myReactionTypes.includes(type) ? "remove" : "add"](post.id, type);
      const fresh = await postService.get(post.id);
      onChanged({ ...post, reactionCounts: fresh.reactionCounts, myReactionTypes: fresh.myReactionTypes });
    } catch {
      setError("Reaction failed. Please retry.");
    } finally {
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
              {formatTimestamp(post.createdAt)}
              {post.updatedAt ? " · edited" : ""}
            </time>
          </div>
        </div>
        {isAdmin ? (
          <div className="post-card__actions">
              <button
                type="button"
                className="btn btn--ghost post-card__delete"
                onClick={() => setConfirmingDelete(true)}
                aria-label="Delete post"
                title="Delete post"
              >
                <X size={20} aria-hidden="true" />
              </button>
          </div>
        ) : null}
      </header>
      {confirmingDelete ? (
        <DeletePostDialog postId={post.id} onClose={() => setConfirmingDelete(false)} onDeleted={onDeleted} />
      ) : null}

      <p className="post-card__caption">{post.caption}</p>

      <MediaGallery media={post.media} onPreviousPost={onPreviousPost} onNextPost={onNextPost} />

      {error ? <p className="post-card__error" role="alert">{error}</p> : null}

      <div className="post-card__footer">
        <ReactionControls
          counts={post.reactionCounts}
          mine={post.myReactionTypes}
          onToggle={toggleReaction}
          canRemove={isAdmin}
          busy={reactionBusy}
        />
        <button
          type="button"
          className="post-card__comment-action"
          onClick={() => setShowComments((v) => !v)}
          aria-expanded={showComments}
          aria-label={`${showComments ? "Hide" : "Show"} ${post.commentCount} comments`}
          title={showComments ? "Hide comments" : "Show comments"}
        >
          <ReactionIcon type="comment" />
          <span>{post.commentCount}</span>
        </button>
        <div className="post-card__reaction-summary" aria-label="Reaction totals">
          {REACTION_TYPES.filter((type) => post.reactionCounts.some((count) => count.reactionType === type && count.count > 0)).map((type) => (
            <span
              key={type}
              className={`post-card__reaction-badge post-card__reaction-badge--${type}`}
              role="img"
              aria-label={`${post.reactionCounts.find((count) => count.reactionType === type)?.count ?? 0} ${type} reactions`}
              title={`${post.reactionCounts.find((count) => count.reactionType === type)?.count ?? 0} ${type} reactions`}
            >
              <ReactionIcon type={type} size={12} />
            </span>
          ))}
        </div>
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
