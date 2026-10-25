import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePagedFeed, type PagedFeed } from "../../hooks/usePagedFeed";
import { DEFAULT_PAGE_SIZE } from "../../components/ui/Pagination";
import { Header } from "../../components/layout/Header";
import { CommunityIntro } from "../../components/layout/CommunityIntro";
import { NewPostForm } from "../../components/feed/NewPostForm";
import { PostList } from "../../components/feed/PostList";
import { EmptyState, ErrorState } from "../../components/ui/Status";
import type { Post } from "../../types";
import "./home.css";

export function HomePage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    const stored = Number(window.localStorage.getItem("feed.pageSize"));
    return [10, 20, 50, 100].includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  });
  const feed = usePagedFeed(page, pageSize);
  const queryClient = useQueryClient();

  const posts: Post[] = feed.data?.items ?? [];
  const total = feed.data?.total ?? 0;

  const onChanged = (updated: Post) => {
    void queryClient.setQueryData(
      ["feed", "paged", pageSize, (page - 1) * pageSize],
      (existing: PagedFeed | undefined) => (existing
        ? { ...existing, items: existing.items.map((post) => (post.id === updated.id ? { ...post, ...updated } : post)) }
        : undefined),
    );
  };

  const onDeleted = (postId: string) => {
    void queryClient.setQueryData(
      ["feed", "paged", pageSize, (page - 1) * pageSize],
      (existing: PagedFeed | undefined) => (existing
        ? { ...existing, items: existing.items.filter((post) => post.id !== postId), total: existing.total - 1 }
        : undefined),
    );
  };

  const onCreated = (post: Post) => {
    // Add to current page and refetch for authoritative data
    void queryClient.setQueryData(
      ["feed", "paged", pageSize, (page - 1) * pageSize],
      (existing: PagedFeed | undefined) => (existing
        ? { ...existing, items: [post, ...existing.items], total: existing.total + 1 }
        : undefined),
    );
    void feed.refetch();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll to top of feed when page changes
    const feedElement = document.getElementById("feed");
    if (feedElement) {
      feedElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    window.localStorage.setItem("feed.pageSize", String(newPageSize));
  };

  return (
    <>
      <Header />
      <main className="community-page">
        <CommunityIntro variant="feed" />
        <div className="community-layout">
        <section className="feed" id="feed" aria-labelledby="feed-title">
          <div className="feed__heading">
            <h2 id="feed-title">Community feed</h2>
            <span className="feed__order">Latest moments</span>
          </div>
          <NewPostForm onCreated={onCreated} />

        {feed.isError ? (
          <ErrorState message="Could not load the feed." onRetry={() => void feed.refetch()} />
        ) : null}
        {!feed.isError && !feed.isLoading && posts.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            hint="Be the first to share an image or video with the community."
          />
        ) : null}

        <PostList
          posts={posts}
          total={total}
          page={page}
          pageSize={pageSize}
          isLoading={feed.isLoading}
          isFetching={feed.isFetching}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onChanged={onChanged}
          onDeleted={onDeleted}
        />
        </section>
        </div>
      </main>
    </>
  );
}