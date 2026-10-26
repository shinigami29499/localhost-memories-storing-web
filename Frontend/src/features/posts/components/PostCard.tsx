import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "@/components/animate-ui/icons/x";
import { AnimateIcon } from "@animate-ui/react/icons";
import type { Comment, Post } from "../types";
import { commentService, postService, reactionService } from "../services/postService";
import { formatTimestamp } from "../../../utils/media";
import { MediaGallery } from "./MediaGallery";
import { CommentSection } from "./CommentSection";
import { ReactionControls, type ReactionType } from "./ReactionControls";
import { CommentIcon } from "./CommentIcon";
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
  const reactionPending = useRef(false);
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
      setError("Reaction failed. Please retry.");
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
              {formatTimestamp(post.createdAt)}
              {post.updatedAt ? " · edited" : ""}
            </time>
          </div>
        </div>
        {isAdmin ? (
          <div className="post-card__actions">
              <AnimateIcon animateOnHover asChild>
                <button
                  type="button"
                  className="btn btn--ghost post-card__delete"
                  onClick={() => setConfirmingDelete(true)}
                  aria-label="Delete post"
                  title="Delete post"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </AnimateIcon>
          </div>
        ) : null}
      </header>
      {confirmingDelete ? (
        <DeletePostDialog postId={post.id} onClose={() => setConfirmingDelete(false)} onDeleted={onDeleted} />
      ) : null}

      {post.caption ? <p className="post-card__caption">{post.caption}</p> : null}

      <MediaGallery media={post.media} onPreviousPost={onPreviousPost} onNextPost={onNextPost} />

      {error ? <p className="post-card__error" role="alert">{error}</p> : null}

      <div className="post-card__footer">
        <ReactionControls
          counts={post.reactionCounts}
          mine={post.myReactionTypes}
          onToggle={toggleReaction}
          busy={reactionBusy}
        />
        <AnimateIcon animateOnHover animateOnTap asChild>
          <button
            type="button"
            className="post-card__comment-action"
            onClick={() => setShowComments((v) => !v)}
            aria-expanded={showComments}
            aria-label={`${showComments ? "Hide" : "Show"} ${post.commentCount} comments`}
            title={showComments ? "Hide comments" : "Show comments"}
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
