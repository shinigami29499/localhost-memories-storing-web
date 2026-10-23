import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { useFeed } from "../../hooks/useFeed";
import { Header } from "../../components/layout/Header";
import { CommunityIntro } from "../../components/layout/CommunityIntro";
import { NewPostForm } from "../../components/feed/NewPostForm";
import { PostViewer } from "../../components/feed/PostViewer";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Status";
import type { Post } from "../../types";
import "./home.css";

function mapPost(
  existing: InfiniteData<{ items: Post[]; total: number; nextOffset: number | undefined }, number> | undefined,
  mutate: (post: Post) => Post | undefined,
): InfiniteData<{ items: Post[]; total: number; nextOffset: number | undefined }, number> | undefined {
  if (!existing) return undefined;
  const pages = existing.pages.map((page) => ({
    ...page,
    items: page.items.flatMap((post) => {
      const replacement = mutate(post);
      return replacement ? [replacement] : []; // undefined removes the post
    }),
  }));
  const removed = existing.pages.reduce((count, page, index) => count + page.items.length - pages[index].items.length, 0);
  return {
    ...existing,
    pages: pages.map((page) => ({ ...page, total: Math.max(0, page.total - removed) })),
  };
}

export function HomePage() {
  const feed = useFeed(5);
  const queryClient = useQueryClient();
  const [viewerVersion, setViewerVersion] = useState(0);

  const posts: Post[] = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const hasMore = feed.hasNextPage;

  const loadMore = async () => {
    const result = await feed.fetchNextPage();
    if (result.isFetchNextPageError) throw result.error;
    return result.data?.pages.flatMap((page) => page.items) ?? [];
  };

  const onChanged = (updated: Post) => {
    void queryClient.setQueryData<InfiniteData<{ items: Post[]; total: number; nextOffset: number | undefined }, number>>(
      ["feed", 5],
      (existing) => mapPost(existing, (post) => (post.id === updated.id ? { ...post, ...updated } : post)),
    );
  };

  const onDeleted = (postId: string) => {
    void queryClient.setQueryData<InfiniteData<{ items: Post[]; total: number; nextOffset: number | undefined }, number>>(
      ["feed", 5],
      (existing) => mapPost(existing, (post) => (post.id === postId ? undefined : post)),
    );
  };

  const onCreated = (post: Post) => {
    // Optimistic insert followed by a refetch for authoritative paging data.
    void queryClient.setQueryData<InfiniteData<{ items: Post[]; total: number; nextOffset: number | undefined }, number>>(
      ["feed", 5],
      (existing) => (existing
        ? { ...existing, pages: [{ items: [post, ...existing.pages[0].items], total: existing.pages[0].total + 1, nextOffset: undefined }, ...existing.pages.slice(1)] }
        : { pages: [{ items: [post], total: 1, nextOffset: undefined }], pageParams: [0] }),
    );
    setViewerVersion((version) => version + 1);
    void feed.refetch();
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

        {feed.isLoading ? <Spinner label="Loading your feed…" /> : null}
        {feed.isError && !feed.data ? (
          <ErrorState message="Could not load the feed." onRetry={() => void feed.refetch()} />
        ) : null}
        {!feed.isLoading && !feed.isError && posts.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            hint="Be the first to share an image or video with the community."
          />
        ) : null}

        <PostViewer
          key={viewerVersion}
          posts={posts}
          total={feed.data?.pages[0]?.total ?? posts.length}
          hasMore={hasMore}
          loadMore={loadMore}
          onChanged={onChanged}
          onDeleted={onDeleted}
        />
        </section>
        </div>
      </main>
    </>
  );
}
