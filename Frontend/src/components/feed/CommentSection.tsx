import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Comment } from "../../types";
import { commentService } from "../../services/postService";
import { useAuthStore } from "../../store/authStore";
import { formatTimestamp } from "../../utils/media";
import { Button, Input } from "../ui";
import { ErrorState, Spinner } from "../ui/Status";

interface Props {
  postId: string;
  comments: Comment[];
  onAdded: (comment: Comment) => void;
  reload: () => void;
}

/** Inline comment list + composer for one post. */
export function CommentSection({ postId, comments, onAdded, reload }: Props) {
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.role?.toLowerCase() === "admin";
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await commentService.list(postId);
      reload();
    } catch {
      setError("Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, [postId, reload]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await commentService.add(postId, draft.trim());
      onAdded(created);
      setDraft("");
    } catch {
      setError("Could not post the comment.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (commentId: string) => {
    try {
      await commentService.remove(commentId);
      reload();
    } catch {
      setError("Could not delete the comment.");
    }
  };

  return (
    <section className="comments" aria-label="Comments">
      {loading ? <Spinner label="Loading comments…" /> : null}
      {error ? <ErrorState message={error} /> : null}

      {comments.length === 0 && !loading ? (
        <p className="comments__none">No comments yet — be the first.</p>
      ) : (
        <ul className="comments__list">
          {comments.map((comment) => (
            <li key={comment.id} className="comments__item">
              <div className="comments__head">
                <strong>{comment.author.username}</strong>
                <time dateTime={comment.createdAt}>{formatTimestamp(comment.createdAt)}</time>
                {isAdmin ? (
                  <button
                    className=" comments__delete"
                    onClick={() => remove(comment.id)}
                    aria-label="Delete comment"
                    title="Delete comment"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <p className="comments__content">{comment.content}</p>
            </li>
          ))}
        </ul>
      )}

      <form
        className="comments__composer"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          value={draft}
          onChange={setDraft}
          placeholder="Write a comment…"
          maxLength={4000}
          aria-label="New comment"
        />
        <Button type="submit" busy={busy} disabled={!draft.trim()}>
          Post
        </Button>
      </form>
    </section>
  );
}
