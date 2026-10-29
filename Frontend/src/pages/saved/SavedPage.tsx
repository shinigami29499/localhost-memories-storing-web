import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Button, EmptyState, ErrorState, Spinner } from "../../components/ui";
import { useLocale } from "../../context/LocaleContext";
import {
  CollectionCard,
  CollectionFormDialog,
  collectionService,
  useCollections,
  useInvalidateCollections,
  type Collection,
  type CollectionScope,
} from "../../features/collections";
import { useAuthStore } from "../../store/authStore";
import "../gallery/gallery.css";
import "./saved.css";

const scopes = [
  { value: "mine", label: "My collections" },
  { value: "public", label: "Public collections" },
] satisfies { value: CollectionScope; label: string }[];

export function SavedPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [scope, setScope] = useState<CollectionScope>("mine");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const collections = useCollections(scope);
  const invalidate = useInvalidateCollections();
  const items = collections.data ?? [];

  return (
    <main className="gallery-page saved-page" aria-label={t("Saved")}>
      <div className="gallery-page__content">
        <div className="gallery-page__inner">
          <header className="gallery-page__header">
            <p className="gallery-page__eyebrow">{t("Keep what matters")}</p>
            <h1>{t("Saved")}<span className="brand__dot">.</span></h1>
            <p>{t("Organize posts into collections and revisit them anytime.")}</p>
          </header>

          <div className="gallery-page__toolbar">
            <div className="gallery-page__filters" role="group" aria-label={t("Collection scope")}>
              {scopes.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className="gallery-page__filter"
                  aria-pressed={scope === value}
                  onClick={() => setScope(value)}
                >
                  {t(label)}
                </button>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden="true" />
              {t("New collection")}
            </Button>
          </div>

          {collections.isPending ? <Spinner label={t("Loading collections…")} /> : collections.isError ? (
            <ErrorState message={t("Could not load collections.")} onRetry={() => void collections.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              title={scope === "mine" ? "No collections yet" : "No public collections yet"}
              hint={scope === "mine" ? "Use Save on any post to start a collection." : undefined}
            />
          ) : (
            <div className="collection-grid" aria-busy={collections.isFetching}>
              {items.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  isOwner={collection.owner.id === me?.id}
                  showOwner={scope === "public"}
                  onEdit={setEditing}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {editing ? (
        <CollectionFormDialog
          collection={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            await collectionService.update(editing.id, input);
            await invalidate();
          }}
        />
      ) : null}
      {creating ? (
        <CollectionFormDialog
          onClose={() => setCreating(false)}
          onSubmit={async ({ name, isPublic }) => {
            const created = await collectionService.create({ name, isPublic });
            await invalidate();
            navigate(`/saved/${created.id}`);
          }}
        />
      ) : null}
    </main>
  );
}
