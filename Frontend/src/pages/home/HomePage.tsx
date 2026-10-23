import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { useFeed } from "../../hooks/useFeed";
import { Header } from "../../components/layout/Header";
import { CommunityIntro } from "../../components/layout/CommunityIntro";
import { NewPostForm } from "../../components/feed/NewPostForm";
import { PostCard } from "../../components/feed/PostCard";
import { Button } from "../../components/ui";
import { EmptyState, ErrorState, Spinner } from "../../components/ui/Status";
import type { Post } from "../../types";
import "./home.css";

function mapPost(
  existing: InfiniteData<{ items: Post[]; total: number; nextOffset: number | undefined }, number> | undefined,
  mutate: (post: Post) => Post | undefined,
): InfiniteData<{ items: Post[]; total: number; nextOffset: number | undefined }, number> | undefined {
  if (!existing) return undefined;
  return {
    ...existing,
    pages: existing.pages.map((page) => ({
      ...page,
      items: page.items.flatMap((post) => {
        const replacement = mutate(post);
        return replacement ? [replacement] : []; // undefined removes the post
      }),
    })),
  };
}

export function HomePage() {
  const feed = useFeed(5);
  const queryClient = useQueryClient();
  const [loadingMore, setLoadingMore] = useState(false);

  const posts: Post[] = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const hasMore = feed.hasNextPage;

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await feed.fetchNextPage();
    } finally {
      setLoadingMore(false);
    }
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
        ? { ...existing, pages: [{ items: [post, ...existing.pages[0].items], total: existing.pages[0].total, nextOffset: undefined }, ...existing.pages.slice(1)] }
        : { pages: [{ items: [post], total: 1, nextOffset: undefined }], pageParams: [0] }),
    );
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
        {feed.isError ? (
          <ErrorState message="Could not load the feed." onRetry={() => void feed.refetch()} />
        ) : null}
        {!feed.isLoading && !feed.isError && posts.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            hint="Be the first to share an image or video with the community."
          />
        ) : null}

        <div className="feed__list">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onChanged={onChanged} onDeleted={onDeleted} />
          ))}
        </div>

        {hasMore && !feed.isLoading ? (
          <div className="feed__more">
            <Button variant="secondary" onClick={loadMore} busy={loadingMore}>
              Load more
            </Button>
          </div>
        ) : null}
        </section>
        <aside className="community-notes" aria-labelledby="community-notes-title">
          <span className="community-notes__symbol" aria-hidden="true">+</span>
          <p className="eyebrow">A little inspiration</p>
          <h2 id="community-notes-title">Make it <span className="gradient-text">a moment.</span></h2>
          <p>There is a story in the everyday. Give yours a place to live.</p>
          <ul className="community-notes__list">
            <li><span>01</span><div><strong>Share your world</strong><p>Bring a photo or video and a few words.</p></div></li>
            <li><span>02</span><div><strong>Start a conversation</strong><p>Leave a comment. Find common ground.</p></div></li>
            <li><span>03</span><div><strong>Spread the good</strong><p>React to the moments that make you smile.</p></div></li>
          </ul>
          <a className="btn btn--primary" href="#create-post">Create a post <span aria-hidden="true">&rarr;</span></a>
          <p className="community-notes__footer">Different perspectives. One community.</p>
        </aside>
        </div>
      </main>
    </>
  );
}
