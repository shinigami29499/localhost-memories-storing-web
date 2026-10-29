import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimateIcon } from "@animate-ui/react/icons";
import { ArrowLeft } from "@/components/animate-ui/icons/arrow-left";
import { Globe } from "@/components/animate-ui/icons/globe";
import { PencilLine } from "@/components/animate-ui/icons/pencil-line";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { Button, ConfirmationDialog, EmptyState, ErrorState, Spinner, showToast } from "../../components/ui";
import { DEFAULT_PAGE_SIZE, Pagination } from "../../components/ui/Pagination";
import { useLocale } from "../../context/LocaleContext";
import {
  CollectionFormDialog,
  collectionService,
  useCollection,
  useCollectionPosts,
  useInvalidateCollections,
} from "../../features/collections";
import { GalleryPostCard } from "../../features/posts/components/GalleryPostCard";
import { ApiError } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { mediaUrl } from "../../utils/media";
import "../gallery/gallery.css";
import "./saved.css";

export function CollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { t } = useLocale();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingPostId, setRemovingPostId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const collection = useCollection(collectionId);
  const posts = useCollectionPosts(collectionId, page, pageSize, collection.isSuccess);
  const invalidate = useInvalidateCollections();
  const total = posts.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isOwner = Boolean(collection.data && me && collection.data.owner.id === me.id);

  useEffect(() => {
    if (posts.isSuccess && !posts.isPlaceholderData && page > totalPages) setPage(totalPages);
  }, [page, posts.isSuccess, posts.isPlaceholderData, totalPages]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [page, pageSize]);

  const removePost = async (postId: string) => {
    if (!collectionId || removingPostId) return;
    setRemovingPostId(postId);
    try {
      await collectionService.removePost(collectionId, postId);
      await invalidate();
    } catch (err) {
      showToast.error(t("Could not remove this post."), err instanceof ApiError ? err.message : undefined);
    } finally {
      setRemovingPostId(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast.success(t("Link copied"));
    } catch {
      showToast.error(t("Could not copy the link."));
    }
  };

  if (collection.isPending) {
    return <main className="gallery-page saved-page"><Spinner label={t("Loading collection…")} /></main>;
  }

  if (collection.isError) {
    const missing = collection.error instanceof ApiError && collection.error.status === 404;
    return (
      <main className="gallery-page saved-page">
        <div className="gallery-page__content">
          <div className="gallery-page__inner">
            {missing ? (
              <EmptyState title="Collection not found" hint="It may be private or deleted." />
            ) : (
              <ErrorState message={t("Could not load this collection.")} onRetry={() => void collection.refetch()} />
            )}
            <Link to="/saved" className="btn btn--secondary saved-page__back">{t("Back to Saved")}</Link>
          </div>
        </div>
      </main>
    );
  }

  const data = collection.data;

  return (
    <main className="gallery-page saved-page" aria-label={data.name}>
      <div className="gallery-page__content" ref={contentRef}>
        <div className="gallery-page__inner">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <Link to="/saved" className="btn btn--ghost saved-page__back">
              <ArrowLeft size={16} aria-hidden="true" />
              {t("Saved")}
            </Link>
          </AnimateIcon>

          <header className="collection-hero">
            <div className="collection-hero__preview" aria-hidden="true">
              {data.previewMediaId ? <img src={mediaUrl(data.previewMediaId)} alt="" /> : null}
            </div>
            <div className="collection-hero__text">
              <p className="gallery-page__eyebrow">
                {t(data.isPublic ? "Public collection" : "Private collection")}
                {" · "}
                {t("by {owner}", { owner: isOwner ? t("You") : data.owner.username })}
              </p>
              <h1>{data.name}<span className="brand__dot">.</span></h1>
              <p>{t("{count} posts", { count: data.postCount })}</p>
              {isOwner || data.isPublic ? (
                <div className="collection-hero__actions">
                  {data.isPublic ? (
                    <Button type="button" variant="secondary" onClick={() => void copyLink()}>
                      <Globe size={16} aria-hidden="true" />
                      {t("Copy share link")}
                    </Button>
                  ) : null}
                  {isOwner ? (
                    <>
                      <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
                        <PencilLine size={16} aria-hidden="true" />
                        {t("Edit")}
                      </Button>
                      <Button type="button" variant="ghost" className="collection-hero__delete" onClick={() => setDeleting(true)}>
                        <Trash2 size={16} aria-hidden="true" />
                        {t("Delete")}
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </header>

          {posts.isPending ? <Spinner label={t("Loading posts…")} /> : posts.isError ? (
            <ErrorState message={t("Could not load posts.")} onRetry={() => void posts.refetch()} />
          ) : (posts.data?.items.length ?? 0) === 0 ? (
            <EmptyState title="This collection is empty" hint={isOwner ? "Use Save on any post to add it here." : undefined} />
          ) : (
            <div className="gallery-grid" aria-busy={posts.isFetching}>
              {posts.data!.items.map((post) => (
                <div key={post.id} className="collection-item">
                  <GalleryPostCard post={post} />
                  {isOwner ? (
                    <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                      <button
                        type="button"
                        className="collection-item__remove"
                        aria-label={t("Remove from collection")}
                        title={t("Remove from collection")}
                        disabled={removingPostId !== null}
                        aria-busy={removingPostId === post.id || undefined}
                        onClick={() => void removePost(post.id)}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </AnimateIcon>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {posts.isSuccess && total > 0 ? (
        <footer className="gallery-page__footer">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            itemLabel="posts"
            isFetching={posts.isFetching}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </footer>
      ) : null}
      {editing ? (
        <CollectionFormDialog
          collection={data}
          onClose={() => setEditing(false)}
          onSubmit={async (input) => {
            await collectionService.update(data.id, input);
            await invalidate();
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmationDialog
          title="Delete collection?"
          danger
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await collectionService.remove(data.id);
            navigate("/saved", { replace: true });
            void invalidate();
          }}
        >
          {t("The collection “{name}” will be deleted. Saved posts stay in the feed.", { name: data.name })}
        </ConfirmationDialog>
      ) : null}
    </main>
  );
}
