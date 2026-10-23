import { useCallback, useEffect, useState } from "react";
import type { Comment, Post } from "../../types";
import { commentService, postService, reactionService } from "../../services/postService";
import { formatTimestamp } from "../../utils/Media";
import { MediaGallery } from "./MediaGallery";
import { CommentSection } from "./CommentSection";
import { ReactionControls, type ReactionType } from "./ReactionControls";
import { useAuthStore } from "../../store/authStore";

interface Props {
  post: Post;
  /** Whenever post data changes the parent should replace the card. */
  onChanged: (updated: Post) => void;
  onDeleted: (postId: string) => void;
}

/** One feed card: media, caption, author, reactions, comments, owner actions. */
export function PostCard({ post, onChanged, onDeleted }: Props) {
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.role === "Admin";
  const canEdit = isAdmin || me?.id === post.author.id;

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

  const removePost = async () => {
    try {
      await postService.remove(post.id);
      onDeleted(post.id);
    } catch {
      setError("Could not delete this post.");
      setConfirmingDelete(false);
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
        {canEdit ? (
          <div className="post-card__actions">
            {confirmingDelete ? (
              <>
                <button className="btn btn--danger" onClick={removePost}>
                  Confirm
                </button>
                <button className="btn btn--ghost" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="btn btn--ghost"
                onClick={() => setConfirmingDelete(true)}
                aria-label="Delete post"
              >
                Delete
              </button>
            )}
          </div>
        ) : null}
      </header>

      <p className="post-card__caption">{post.caption}</p>

      <MediaGallery media={post.media} />

      {error ? <p className="post-card__error" role="alert">{error}</p> : null}

      <div className="post-card__footer">
        <ReactionControls
          counts={post.reactionCounts}
          mine={post.myReactionTypes}
          onToggle={toggleReaction}
          busy={reactionBusy}
        />
        <button
          className="btn btn--ghost"
          onClick={() => setShowComments((v) => !v)}
          aria-expanded={showComments}
        >
          💬 {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
        </button>
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
