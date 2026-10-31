import { startTransition, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Button, ErrorState, Spinner } from "../../components/ui";
import { PageTransition } from "../../components/layout/PageTransition";
import { readPageTransitionEffect } from "../../utils/pageTransition";
import { useLocale } from "../../context/LocaleContext";
import {
  albumKeys,
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
  const { t, language } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requestRef = useRef(0);
  const [loadingScope, setLoadingScope] = useState(false);
  const pageTransition = readPageTransitionEffect();
  useEffect(() => () => { requestRef.current += 1; }, []);
  const me = useAuthStore((s) => s.user);
  const [scope, setScope] = useState<AlbumScope>("mine");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Album | null>(null);
  const albums = useAlbums(scope);
  const invalidate = useInvalidateAlbums();
  const items = albums.data ?? [];
  const groups = new Map<string, { date: Date; items: Album[] }>();
  for (const album of items) {
    const date = new Date(album.createdAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const group = groups.get(key);
    if (group) group.items.push(album);
    else groups.set(key, { date, items: [album] });
  }
  const dateGroups = [...groups.entries()].sort(([, a], [, b]) => b.date.getTime() - a.date.getTime());
  const dateFormatter = new Intl.DateTimeFormat(language, { year: "numeric", month: "long", day: "numeric" });

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
                  onClick={() => {
                    const request = ++requestRef.current;
                    if (value === scope) { setLoadingScope(false); return; }
                    setLoadingScope(true);
                    void queryClient.fetchQuery({ queryKey: albumKeys.list(value), queryFn: () => albumService.list(value) })
                      .catch(() => undefined)
                      .then(() => {
                        if (request !== requestRef.current) return;
                        setLoadingScope(false);
                        startTransition(() => setScope(value));
                      });
                  }}
                >
                  {t(label)}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="album-page__create-button"
              aria-label={t("New album")}
              title={t("New album")}
              onClick={() => setCreating(true)}
            >
              <Plus size={16} aria-hidden="true" />
              <span className="album-page__create-label">{t("New album")}</span>
            </Button>
          </div>

          <div className="gallery-page__tab-panel--media" aria-busy={loadingScope || undefined}>
          <PageTransition effect={pageTransition} transitionKey={scope}>
          {albums.isPending ? <Spinner label={t("Loading albums…")} /> : albums.isError ? (
            <ErrorState message={t("Could not load albums.")} onRetry={() => void albums.refetch()} />
          ) : items.length === 0 ? null : (
            <div className="gallery-groups" aria-busy={albums.isFetching}>
              {dateGroups.map(([key, group]) => (
                <section key={key} aria-label={dateFormatter.format(group.date)}>
                  <div className="gallery-group__header">
                    <h2 className="gallery-group__title">
                      <time dateTime={`${group.date.getFullYear()}-${String(group.date.getMonth() + 1).padStart(2, "0")}-${String(group.date.getDate()).padStart(2, "0")}`}>
                        {dateFormatter.format(group.date)}
                      </time>
                    </h2>
                  </div>
                  <div className="album-grid">
                    {group.items.map((album) => (
                      <AlbumCard
                        key={album.id}
                        album={album}
                        isOwner={album.owner.id === me?.id}
                        showOwner={scope === "public"}
                        onEdit={setEditing}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          </PageTransition>
          </div>
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
