import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Button, EmptyState, ErrorState, Spinner } from "../../components/ui";
import { useLocale } from "../../context/LocaleContext";
import {
  AlbumCard,
  AlbumFormDialog,
  albumService,
  useAlbums,
  useInvalidateAlbums,
  type Album,
  type AlbumScope,
} from "../../features/albums";
import { useAuthStore } from "../../store/authStore";
import "../gallery/gallery.css";
import "./albums.css";

const scopes = [
  { value: "mine", label: "My albums" },
  { value: "public", label: "Public albums" },
] satisfies { value: AlbumScope; label: string }[];

export function AlbumsPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [scope, setScope] = useState<AlbumScope>("mine");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Album | null>(null);
  const albums = useAlbums(scope);
  const invalidate = useInvalidateAlbums();
  const items = albums.data ?? [];

  return (
    <main className="gallery-page album-page" aria-label={t("Album")}>
      <div className="gallery-page__content">
        <div className="gallery-page__inner">
          <header className="gallery-page__header">
            <p className="gallery-page__eyebrow">{t("Keep what matters")}</p>
            <h1>{t("Album")}<span className="brand__dot">.</span></h1>
            <p>{t("Organize images and videos into albums and revisit them anytime.")}</p>
          </header>

          <div className="gallery-page__toolbar">
            <div className="gallery-page__filters" role="group" aria-label={t("Album scope")}>
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
              {t("New album")}
            </Button>
          </div>

          {albums.isPending ? <Spinner label={t("Loading albums…")} /> : albums.isError ? (
            <ErrorState message={t("Could not load albums.")} onRetry={() => void albums.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              title={scope === "mine" ? "No albums yet" : "No public albums yet"}
              hint={scope === "mine" ? "Use Save on any image or video to start an album." : undefined}
            />
          ) : (
            <div className="album-grid" aria-busy={albums.isFetching}>
              {items.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  isOwner={album.owner.id === me?.id}
                  showOwner={scope === "public"}
                  onEdit={setEditing}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {editing ? (
        <AlbumFormDialog
          album={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input, previewFile) => {
            await albumService.update(editing.id, {
              ...input,
              previewMediaId: previewFile ? editing.customPreviewMediaId : input.previewMediaId,
            });
            try {
              if (previewFile) await albumService.uploadPreviewImage(editing.id, previewFile);
            } finally {
              await invalidate();
            }
          }}
        />
      ) : null}
      {creating ? (
        <AlbumFormDialog
          onClose={() => setCreating(false)}
          onSubmit={async ({ name, isPublic }) => {
            const created = await albumService.create({ name, isPublic });
            await invalidate();
            navigate(`/library/album/${created.id}`);
          }}
        />
      ) : null}
    </main>
  );
}
