import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import type { Post } from "../types";
import { Pagination } from "../../../components/ui/Pagination";
import { PostCard } from "./PostCard";
import "./PostList.css";

interface PostListProps {
  posts: Post[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onChanged: (post: Post) => void;
  onDeleted: (id: string) => void;
}

export function PostList({
  posts,
  total,
  page,
  pageSize,
  isLoading,
  isFetching,
  onPageChange,
  onPageSizeChange,
  onChanged,
  onDeleted,
}: PostListProps) {
  // Reset to first page when total changes (e.g., after post deletion)
  useEffect(() => {
    if (total === 0 && page > 1) {
      onPageChange(1);
    }
  }, [total, page, onPageChange]);

  if (isLoading) {
    return (
      <div className="post-list-loading">
        <LoaderCircle className="spinner__wheel" aria-hidden="true" />
        <span>Loading posts...</span>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="post-list-empty">
        <p className="post-list-empty__message">No posts to display.</p>
      </div>
    );
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

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        itemLabel="posts"
        isFetching={isFetching}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />

      {isFetching && (
        <div className="post-list-fetching">
          <LoaderCircle className="spinner__wheel" aria-hidden="true" />
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
}