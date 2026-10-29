import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { PostCard } from "../../features/posts/components/PostCard";
import { postService } from "../../features/posts/services/postService";
import type { Post } from "../../features/posts/types";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Status";
import "./post-detail.css";
import { useLocale } from "../../context/LocaleContext";

export function PostDetailPage() {
  const { t } = useLocale();
  const { postId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const post = useQuery({
    queryKey: ["post", postId],
    queryFn: () => {
      if (!postId) throw new Error("A post ID is required.");
      return postService.get(postId);
    },
    enabled: Boolean(postId),
  });

  const onChanged = (updated: Post) => {
    queryClient.setQueryData(["post", postId], updated);
  };

  if (post.isLoading) return <main className="post-detail"><Spinner label={t("Loading post…")} /></main>;
  if (post.isError || !postId) {
    return (
      <main className="post-detail">
        <ErrorState message={t("Could not load this post.")} onRetry={() => void post.refetch()} />
      </main>
    );
  }
  if (!post.data) return <main className="post-detail"><EmptyState title={t("This post is no longer available.")} /></main>;

  return (
    <main className="post-detail">
      <PostCard
        key={post.data.id}
        post={post.data}
        commentsLockedOpen
        initialCommentsOpen
        onChanged={onChanged}
        onDeleted={() => {
          void queryClient.invalidateQueries({ queryKey: ["feed"] });
          navigate("/", { replace: true });
        }}
      />
    </main>
  );
}
