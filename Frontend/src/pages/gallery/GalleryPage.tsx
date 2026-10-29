import { useEffect, useMemo, useRef, useState } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Heart } from "@/components/animate-ui/icons/heart";
import { Image } from "@/components/animate-ui/icons/image";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { Clapperboard } from "@/components/animate-ui/icons/clapperboard";
import { BulkSaveToCollectionDialog } from "../../features/collections/components/BulkSaveToCollectionDialog";
import { SavedCollectionDialog } from "../../features/collections/components/SavedCollectionDialog";
import { collectionKeys, collectionService, type Collection } from "../../features/collections";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { showToast } from "../../components/ui/Toast";
import { useLocale } from "../../context/LocaleContext";
import { useGalleryFeed, type Post } from "../../features/posts";
import { GalleryLightbox } from "../../features/posts/components/GalleryLightbox";
import { GalleryPostCard } from "../../features/posts/components/GalleryPostCard";
import { postService, reactionService } from "../../features/posts/services/postService";
import { ApiError } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { formatGroupLabel, groupPostsByDate } from "./galleryGroups";
import "./gallery.css";

const GROUP_BATCH = 5;
const POST_BATCH = 20;

type MediaFilter = "all" | "image" | "video";
export type GalleryView = "pictures" | "videos" | "favorites";

const filters = [
  { value: "all", label: "All" },
  { value: "image", label: "Image", icon: Image },
  { value: "video", label: "Video", icon: Clapperboard },
] satisfies { value: MediaFilter; label: string; icon?: typeof Image }[];

const viewCopy: Record<GalleryView, { title: string; description: string; emptyTitle: string; emptyHint: string }> = {
  pictures: {
    title: "Pictures",
    description: "All photos and videos shared by the community.",
    emptyTitle: "Nothing here yet",
    emptyHint: "Be the first to share an image or video with the community.",
  },
  videos: {
    title: "Videos",
    description: "Every video shared by the community.",
    emptyTitle: "No videos yet",
    emptyHint: "Videos shared in posts appear here.",
  },
  favorites: {
    title: "Favorites",
    description: "Posts you have hearted.",
    emptyTitle: "No favorites yet",
    emptyHint: "Tap the heart on a post to add it here.",
  },
};

function withFilteredMedia(post: Post, filter: MediaFilter): Post[] {
  const media = filter === "all" ? post.media : post.media.filter((file) => file.mediaKind === filter);
  return media.length > 0 ? [{ ...post, media, mediaCount: media.length }] : [];
}

export function GalleryPage({ view = "pictures" }: { view?: GalleryView }) {
  const { t, language } = useLocale();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const me = useAuthStore((state) => state.user);
  const isAdmin = me?.role?.toLowerCase() === "admin";
  const [selectedFilter, setFilter] = useState<MediaFilter>("all");
  const [groupLimit, setGroupLimit] = useState(GROUP_BATCH);
  const [viewer, setViewer] = useState<{ posts: Post[]; postId: string } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [collectionChooser, setCollectionChooser] = useState<Collection[] | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const showFilters = view === "favorites";
  const selectionAvailable = view !== "favorites";
  const filter: MediaFilter = view === "videos" ? "video" : showFilters ? selectedFilter : "all";
  const copy = viewCopy[view];
  const contentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const posts = useGalleryFeed(POST_BATCH, {
    source: view === "favorites" ? "favorites" : "feed",
    mediaKind: filter === "all" ? undefined : filter,
  });
  const { fetchNextPage, hasNextPage, isFetching, isFetchNextPageError, isFetchingNextPage } = posts;
  const total = posts.data?.pages[0]?.total ?? 0;
  const groups = useMemo(
    () => groupPostsByDate((posts.data?.pages ?? []).flatMap((page) => page.items.flatMap((post) => withFilteredMedia(post, filter)))),
    [posts.data, filter],
  );
  const visibleGroups = groups.slice(0, groupLimit);
  const hasHiddenGroups = groups.length > groupLimit;
  const visiblePosts = useMemo(() => visibleGroups.flatMap((group) => group.posts), [groups, groupLimit]);
  const collectionQueries = useQueries({
    queries: view === "favorites" ? [] : visiblePosts.map((post) => ({
      queryKey: collectionKeys.list("mine", post.id),
      queryFn: () => collectionService.list("mine", post.id),
      staleTime: 60_000,
    })),
  });
  const savedCollectionsByPostId = useMemo(() => {
    const savedByPostId = new Map<string, Collection[]>();
    visiblePosts.forEach((post, index) => {
      const saved = collectionQueries[index]?.data?.filter((collection) => collection.containsPost) ?? [];
      if (saved.length > 0) savedByPostId.set(post.id, saved);
    });
    return savedByPostId;
  }, [visiblePosts, collectionQueries]);
  const loadedPosts = useMemo(() => groups.flatMap((group) => group.posts), [groups]);
  const postsById = useMemo(() => new Map(loadedPosts.map((post) => [post.id, post])), [loadedPosts]);
  const selectedPosts = useMemo(
    () => Array.from(selectedIds).flatMap((id) => {
      const post = postsById.get(id);
      return post ? [post] : [];
    }),
    [postsById, selectedIds],
  );
  const allSelectedPostsFavorited = selectedPosts.length > 0
    && selectedPosts.every((post) => post.myReactionTypes.includes("heart"));

  useEffect(() => {
    setGroupLimit(GROUP_BATCH);
    contentRef.current?.scrollTo({ top: 0 });
    setSelectionMode(false);
    setSelectedIds(new Set());
    setSaveDialogOpen(false);
    setCollectionChooser(null);
    setConfirmingDelete(false);
  }, [view, filter]);

  // Keep loading until one group beyond the limit exists, so the last visible day is complete.
  useEffect(() => {
    if (posts.isSuccess && hasNextPage && !hasHiddenGroups && !isFetching && !isFetchNextPageError) void fetchNextPage();
  }, [posts.isSuccess, hasNextPage, hasHiddenGroups, isFetching, isFetchNextPageError, fetchNextPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasHiddenGroups) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        setGroupLimit((limit) => limit + GROUP_BATCH);
      }
    }, { root: contentRef.current, rootMargin: "0px 0px 400px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasHiddenGroups, groupLimit]);

  const isFiltered = total === 0 && filter !== "all" && showFilters;
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };
  const setPostSelected = (postId: string, selected: boolean) => {
    setSelectionMode(true);
    setSelectedIds((current) => {
      if (current.has(postId) === selected) return current;
      const next = new Set(current);
      if (selected) next.add(postId);
      else next.delete(postId);
      return next;
    });
  };
  const enterSelectionWithPost = (postId: string) => {
    if (selectionMode) return;
    setSelectionMode(true);
    setSelectedIds(new Set([postId]));
  };
  const applyFavorites = async () => {
    if (favoriteBusy || selectedPosts.length === 0) return;
    setFavoriteBusy(true);
    try {
      const postsToChange = selectedPosts.filter((post) =>
        allSelectedPostsFavorited ? post.myReactionTypes.includes("heart") : !post.myReactionTypes.includes("heart"),
      );
      const results = await Promise.allSettled(postsToChange.map((post) =>
        allSelectedPostsFavorited
          ? reactionService.remove(post.id, "heart")
          : reactionService.add(post.id, "heart"),
      ));
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed > 0) {
        showToast.error(t("{count} posts could not be updated.", { count: failed }));
        return;
      }
      showToast.success(t(allSelectedPostsFavorited ? "Favorites removed" : "Posts added to favorites"));
      exitSelectionMode();
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not update favorites."));
    } finally {
      setFavoriteBusy(false);
    }
  };
  const deleteSelectedPosts = async () => {
    try {
      for (const post of selectedPosts) {
        await postService.remove(post.id);
        setSelectedIds((current) => {
          const next = new Set(current);
          next.delete(post.id);
          return next;
        });
      }
      showToast.success(t("Posts deleted successfully"));
      exitSelectionMode();
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    }
  };

  return (
    <main className="gallery-page" aria-label={t(copy.title)}>
      <div className="gallery-page__content" ref={contentRef}>
        <div className="gallery-page__inner">
          <header className="gallery-page__header">
            <p className="gallery-page__eyebrow">{t("Gallery")}</p>
            <h1>{t(copy.title)}<span className="brand__dot">.</span></h1>
            <p>{t(copy.description)}</p>
          </header>

          {showFilters ? (
            <div className="gallery-page__toolbar">
              <div className="gallery-page__filters" role="group" aria-label={t("Filter by media type")}>
                {filters.map(({ value, label, icon: Icon }) => (
                  <AnimateIcon key={value} animateOnHover animateOnTap completeOnStop asChild>
                    <button
                      type="button"
                      className="gallery-page__filter"
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                    >
                      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
                      {t(label)}
                    </button>
                  </AnimateIcon>
                ))}
              </div>
            </div>
          ) : null}

          {posts.isPending ? <Spinner label={t("Loading posts…")} /> : posts.isError && !posts.data ? (
            <ErrorState message={t("Could not load posts.")} onRetry={() => void posts.refetch()} />
          ) : groups.length === 0 && !hasNextPage ? (
            <EmptyState
              title={isFiltered ? "No matching posts" : copy.emptyTitle}
              hint={isFiltered ? "Try another media filter." : copy.emptyHint}
            />
          ) : (
            <div className="gallery-groups" aria-busy={isFetching}>
              {visibleGroups.map((group) => (
                <section key={group.key} className="gallery-group" aria-labelledby={`gallery-group-${group.key}`}>
                  <h2 id={`gallery-group-${group.key}`} className="gallery-group__title">
                    <time dateTime={group.key}>{formatGroupLabel(group.date, language, t)}</time>
                  </h2>
                  <div className="gallery-grid">
                    {group.posts.map((post) => (
                      <GalleryPostCard
                        key={post.id}
                        post={post}
                        selectionMode={selectionMode}
                        selected={selectedIds.has(post.id)}
                        savedCollectionCount={savedCollectionsByPostId.get(post.id)?.length}
                        onSavedCollectionClick={() => {
                          const collections = savedCollectionsByPostId.get(post.id) ?? [];
                          if (collections.length === 1) navigate(`/saved/${collections[0].id}`);
                          else if (collections.length > 1) setCollectionChooser(collections);
                        }}
                        onSelect={setPostSelected}
                        onLongPress={selectionAvailable && !selectionMode ? enterSelectionWithPost : undefined}
                        onOpen={(selected) => setViewer({ posts: visibleGroups.flatMap((item) => item.posts), postId: selected.id })}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {collectionQueries.some((query) => query.isError) ? (
                <ErrorState
                  message={t("Could not check saved collections.")}
                  onRetry={() => {
                    for (const query of collectionQueries) {
                      if (query.isError) void query.refetch();
                    }
                  }}
                />
              ) : null}
              <div ref={sentinelRef} className="gallery-groups__sentinel" aria-hidden="true" />
              {isFetchNextPageError ? (
                <ErrorState message={t("Could not load posts.")} onRetry={() => void fetchNextPage()} />
              ) : isFetchingNextPage && !hasHiddenGroups ? (
                <Spinner label={t("Loading...")} />
              ) : !hasNextPage && !hasHiddenGroups ? (
                <p className="gallery-groups__end" role="status">{t("No more posts to show.")}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
      {selectionMode ? (
        <footer className="gallery-page__footer" aria-label={t("Selection actions")}>
          <div className="gallery-selection-bar">
            <span className="gallery-selection-bar__count" aria-live="polite">
              {t("{count} selected", { count: selectedIds.size })}
            </span>
            <span className="gallery-selection-bar__divider" aria-hidden="true" />
            <button
              type="button"
              className="gallery-selection-bar__action"
              disabled={selectedIds.size === 0 || favoriteBusy}
              onClick={() => setSaveDialogOpen(true)}
              aria-label={t("Save selected posts")}
              title={t("Save")}
            >
              <Bookmark size={18} aria-hidden="true" />
              <span className="gallery-selection-bar__label">{t("Save")}</span>
            </button>
            {isAdmin ? (
              <button
                type="button"
                className="gallery-selection-bar__action gallery-selection-bar__action--danger"
                disabled={selectedIds.size === 0 || favoriteBusy}
                onClick={() => setConfirmingDelete(true)}
                aria-label={t("Delete selected posts")}
                title={t("Delete")}
              >
                <Trash2 size={18} aria-hidden="true" />
                <span className="gallery-selection-bar__label">{t("Delete")}</span>
              </button>
            ) : null}
            <button
              type="button"
              className="gallery-selection-bar__action"
              disabled={selectedIds.size === 0 || favoriteBusy}
              onClick={() => void applyFavorites()}
              aria-label={t(allSelectedPostsFavorited ? "Remove selected favorites" : "Favorite selected posts")}
              title={t(allSelectedPostsFavorited ? "Unfavorite" : "Favorite")}
              aria-busy={favoriteBusy || undefined}
            >
              {favoriteBusy ? <LoaderCircle size={18} className="spinner__wheel" aria-hidden="true" /> : (
                <Heart
                  size={18}
                  fill={allSelectedPostsFavorited ? "var(--danger)" : "none"}
                  stroke="var(--danger)"
                  aria-hidden="true"
                />
              )}
              <span className="gallery-selection-bar__label">{t(allSelectedPostsFavorited ? "Unfavorite" : "Favorite")}</span>
            </button>
            <button
              type="button"
              className="gallery-selection-bar__cancel"
              onClick={exitSelectionMode}
              aria-label={t("Exit selection mode")}
              title={t("Cancel")}
            >
              <X size={18} aria-hidden="true" />
              <span>{t("Cancel")}</span>
            </button>
          </div>
        </footer>
      ) : null}
      {saveDialogOpen ? (
        <BulkSaveToCollectionDialog
          postIds={selectedPosts.map((post) => post.id)}
          onSaved={() => {
            setSaveDialogOpen(false);
            exitSelectionMode();
          }}
          onClose={() => setSaveDialogOpen(false)}
        />
      ) : null}
      {collectionChooser ? (
        <SavedCollectionDialog
          collections={collectionChooser}
          onClose={() => setCollectionChooser(null)}
          onSelect={(collection) => {
            setCollectionChooser(null);
            navigate(`/saved/${collection.id}`);
          }}
        />
      ) : null}
      {confirmingDelete ? (
        <ConfirmationDialog
          title={t("Delete {count} posts?", { count: selectedIds.size })}
          danger
          onClose={() => setConfirmingDelete(false)}
          onConfirm={deleteSelectedPosts}
        >
          <p>{t("Selected posts will move to trash and can be restored by an administrator.")}</p>
        </ConfirmationDialog>
      ) : null}
      {viewer ? <GalleryLightbox posts={viewer.posts} initialPostId={viewer.postId} onClose={() => setViewer(null)} /> : null}
    </main>
  );
}
