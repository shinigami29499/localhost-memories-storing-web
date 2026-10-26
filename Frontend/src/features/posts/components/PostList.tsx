import { useEffect, useRef } from "react";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import type { Post } from "../types";
import { ErrorState } from "../../../components/ui/Status";
import { PostCard } from "./PostCard";
import "./PostList.css";

interface PostListProps {
  posts: Post[];
  isLoading: boolean;
  isFetching: boolean;
  hasNextPage: boolean;
  isError: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onChanged: (post: Post) => void;
  onDeleted: (id: string) => void;
}

export function PostList({
  posts,
  isLoading,
  isFetching,
  hasNextPage,
  isError,
  onLoadMore,
  onRetry,
  onChanged,
  onDeleted,
}: PostListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetching || isError) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        onLoadMore();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, isError, onLoadMore, posts.length]);

  if (isLoading) {
    return (
      <div className="post-list-loading" role="status">
        <LoaderCircle className="spinner__wheel" aria-hidden="true" />
        <span>Loading posts...</span>
      </div>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="post-list">
      <div className="post-list__container" aria-busy={isFetching}>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onChanged={onChanged}
            onDeleted={onDeleted}
          />
        ))}
      </div>

      <div ref={sentinelRef} className="post-list__sentinel" aria-hidden="true" />
      {isError ? (
        <ErrorState message="Could not load the feed." onRetry={onRetry} />
      ) : isFetching ? (
        <div className="post-list-fetching" role="status">
          <LoaderCircle className="spinner__wheel" aria-hidden="true" />
          <span>Loading...</span>
        </div>
      ) : !hasNextPage ? (
        <p className="post-list-end" role="status">No more posts to show.</p>
      ) : null}
    </div>
  );
}