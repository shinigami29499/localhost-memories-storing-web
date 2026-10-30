import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, ConfirmationDialog, ErrorState, showToast } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { locationService } from "../services/locationService";
import type { MediaFile, PickedLocation } from "../../media/types";

interface Props {
  media: MediaFile;
  draft: PickedLocation | null;
  onChange: (location: PickedLocation | null) => void;
}

export function LocationEditor({ media, draft, onChange }: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<"save" | "remove" | null>(null);

  const mutation = useMutation({
    mutationKey: ["media-location", media.id],
    mutationFn: (location: PickedLocation | null) => locationService.set(media.id, location),
    onSuccess: async (_, location) => {
      onChange(location);
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await queryClient.invalidateQueries({ queryKey: ["albums"] });
      showToast.success(t(location ? "Location saved." : "Location removed."));
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft) setConfirming("save");
  };

  return (
    <form className="locations__editor" onSubmit={submit}>
      <p>{t("Click the map or a place label to place this photo.")}</p>
      {draft ? (
        <p className="locations__picked" aria-live="polite">
          <span>{t(draft.placeName ? "Picked place" : "Picked point")}</span>
          {draft.placeName && <strong className="locations__picked-place">{draft.placeName}</strong>}
          <strong>{draft.latitude.toFixed(6)}, {draft.longitude.toFixed(6)}</strong>
        </p>
      ) : <p className="locations__hint">{t("No map point picked yet.")}</p>}
      <p className="locations__hint">{t("Locations are visible to everyone who can view the photo.")}</p>
      <div className="locations__actions">
        <Button type="submit" disabled={!draft} busy={mutation.isPending}>{t("Save location")}</Button>
        {media.location && (
          <Button type="button" variant="secondary" disabled={mutation.isPending}
            onClick={() => setConfirming("remove")}>{t("Remove location")}</Button>
        )}
      </div>
      {mutation.isError && <ErrorState message={mutation.error.message} />}
      {confirming && (
        <ConfirmationDialog
          title={confirming === "save" ? "Save this location?" : "Remove this location?"}
          danger={confirming === "remove"}
          onClose={() => setConfirming(null)}
          onConfirm={async () => { await mutation.mutateAsync(confirming === "save" ? draft : null); }}
        >
          <p>{confirming === "save" && draft
            ? draft.placeName
              ? t("“{name}” will be placed at {place} ({latitude}, {longitude}).", {
                name: media.originalFilename,
                place: draft.placeName,
                latitude: draft.latitude.toFixed(6),
                longitude: draft.longitude.toFixed(6),
              })
              : t("“{name}” will be placed at {latitude}, {longitude}.", {
                name: media.originalFilename,
                latitude: draft.latitude.toFixed(6),
                longitude: draft.longitude.toFixed(6),
              })
            : t("The location will be removed from “{name}”.", { name: media.originalFilename })}</p>
        </ConfirmationDialog>
      )}
    </form>
  );
}
