import { useId, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PencilLine } from "@/components/animate-ui/icons/pencil-line";
import { Button, showToast } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { albumKeys, useInvalidateAlbums } from "../hooks/useAlbums";
import { albumService } from "../services/albumService";
import { ALBUM_CAPTION_MAX_LENGTH, type Album } from "../types";

export function AlbumCaption({ album, canEdit }: { album: Album; canEdit: boolean }) {
  const { t } = useLocale();
  const id = useId();
  const editRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAlbums();

  const closeEditor = () => {
    setEditing(false);
    requestAnimationFrame(() => editRef.current?.focus());
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !canEdit) return;
    setSaving(true);
    try {
      const previousCaption = album.caption;
      const updated = await albumService.updateCaption(album.id, draft.trim());
      queryClient.setQueryData(albumKeys.detail(album.id), updated);
      void invalidate();
      closeEditor();
      showToast.success(t("Caption saved"), {
        undo: async () => {
          const reverted = await albumService.updateCaption(album.id, previousCaption);
          queryClient.setQueryData(albumKeys.detail(album.id), reverted);
          await invalidate();
        },
      });
    } catch (err) {
      showToast.error(t("Could not update album caption."), err instanceof ApiError ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit && !album.caption) return null;

  return (
    <section className="album-caption" aria-labelledby={`${id}-label`}>
      <div className="album-caption__heading">
        <h2 id={`${id}-label`}>{t("Album caption")}</h2>
        {canEdit && !editing ? (
          <button
            ref={editRef}
            type="button"
            className="btn btn--ghost album-caption__edit"
            onClick={() => {
              setDraft(album.caption);
              setEditing(true);
            }}
          >
            <PencilLine size={16} aria-hidden="true" />
            {t(album.caption ? "Edit caption" : "Add caption")}
          </button>
        ) : null}
      </div>
      {editing ? (
        <form className="album-caption-editor" aria-busy={saving} onSubmit={(event) => void save(event)}>
          <textarea
            aria-labelledby={`${id}-label`}
            aria-describedby={`${id}-count`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !saving) {
                event.preventDefault();
                closeEditor();
              }
            }}
            maxLength={ALBUM_CAPTION_MAX_LENGTH}
            rows={5}
            autoFocus
            disabled={saving}
          />
          <div className="album-caption-editor__footer">
            <small id={`${id}-count`} className="album-caption-editor__count">
              {t("{count} / {max} characters", { count: draft.length, max: ALBUM_CAPTION_MAX_LENGTH })}
            </small>
            <div className="album-caption-editor__actions">
              <Button type="button" variant="ghost" disabled={saving} onClick={closeEditor}>
                {t("Cancel")}
              </Button>
              <Button type="submit" busy={saving} disabled={draft.trim() === album.caption}>
                {t("Save caption")}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <p className={`album-caption__text${album.caption ? "" : " album-caption__text--empty"}`} tabIndex={album.caption ? 0 : undefined}>
          {album.caption || t("Add a caption to tell the story of this album.")}
        </p>
      )}
    </section>
  );
}
