import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { NewPostForm, PostList, useFeed, type FeedPage, type Post } from "../../features/posts";
import { CommunityIntro } from "../../components/layout/CommunityIntro";
import { EmptyState, ErrorState } from "../../components/ui/Status";
import { useLocale } from "../../context/LocaleContext";
import "./home.css";

export function HomePage() {
  const { t } = useLocale();
  const feed = useFeed(5);
  const queryClient = useQueryClient();

  const posts = feed.data?.pages.flatMap((page) => page.items) ?? [];

  const onChanged = (updated: Post) => {
    queryClient.setQueryData<InfiniteData<FeedPage>>(
      ["feed", 5],
      (existing) => (existing
        ? {
          ...existing,
          pages: existing.pages.map((page) => ({
            ...page,
            items: page.items.map((post) => (post.id === updated.id ? { ...post, ...updated } : post)),
          })),
        }
        : undefined),
    );
  };

  const onDeleted = (postId: string) => {
    queryClient.setQueryData<InfiniteData<FeedPage>>(
      ["feed", 5],
      (existing) => (existing
        ? {
          ...existing,
          pages: existing.pages.map((page) => ({
            ...page,
            items: page.items.filter((post) => post.id !== postId),
          })),
        }
        : undefined),
    );
    void queryClient.invalidateQueries({ queryKey: ["feed", 5], exact: true });
  };

  const onCreated = () => {
    void queryClient.invalidateQueries({ queryKey: ["feed", 5], exact: true });
  };

  return (
    <main className="community-page">
      <CommunityIntro variant="feed" />
      <div className="community-layout">
        <section className="feed" id="feed" aria-labelledby="feed-title">
          {feed.isError && posts.length === 0 ? (
            <ErrorState message="Could not load the feed." onRetry={() => void feed.refetch()} />
          ) : null}
          {!feed.isError && !feed.isLoading && posts.length === 0 ? (
            <EmptyState
              title={t("Nothing here yet")}
              hint={t("Be the first to share an image or video with the community.")}
            />
          ) : null}

          <PostList
            posts={posts}
            isLoading={feed.isLoading}
            isFetching={feed.isFetching}
            hasNextPage={feed.hasNextPage}
            isError={feed.isError}
            onLoadMore={() => void feed.fetchNextPage()}
            onRetry={() => void (feed.isFetchNextPageError ? feed.fetchNextPage() : feed.refetch())}
            onChanged={onChanged}
            onDeleted={onDeleted}
          />
        </section>
        <aside className="community-rail" aria-label={t("Create a post")}>
          <NewPostForm onCreated={onCreated} />
        </aside>
      </div>
    </main>
  );
}