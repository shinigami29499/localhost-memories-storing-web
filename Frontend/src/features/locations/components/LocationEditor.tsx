import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, ConfirmationDialog, ErrorState, showToast } from "../../../components/ui";
import { Check } from "../../../components/animate-ui/icons/check";
import { Trash2 } from "../../../components/animate-ui/icons/trash-2";
import { X } from "../../../components/animate-ui/icons/x";
import { useLocale } from "../../../context/LocaleContext";
import { locationService } from "../services/locationService";
import type { MediaFile, PickedLocation } from "../../media/types";

interface Props {
  media: MediaFile;
  draft: PickedLocation | null;
  onChange: (location: PickedLocation | null) => void;
  onSaved: () => void;
  onCancel: () => void;
}

export function LocationEditor({ media, draft, onChange, onSaved, onCancel }: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<"save" | "remove" | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [compactActions, setCompactActions] = useState(false);
  const saveLabel = t("Save location");
  const removeLabel = t("Remove location");
  const cancelLabel = t("Cancel");

  useLayoutEffect(() => {
    const actions = actionsRef.current;
    if (!actions) return;
    const labels = actions.querySelectorAll<HTMLElement>(".locations__action-label");
    const measure = () => {
      let requiredWidth = 0;
      for (const label of labels) {
        const button = label.parentElement!;
        const style = getComputedStyle(button);
        requiredWidth += label.getBoundingClientRect().width + 20
          + parseFloat(style.columnGap) + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
          + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
      }
      requiredWidth += Math.max(0, labels.length - 1) * parseFloat(getComputedStyle(actions).columnGap);
      setCompactActions(requiredWidth > actions.clientWidth);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(actions);
    labels.forEach((label) => observer.observe(label));
    measure();
    return () => observer.disconnect();
  }, [saveLabel, removeLabel, cancelLabel, media.location]);

  const mutation = useMutation({
    mutationKey: ["media-location", media.id],
    mutationFn: (location: PickedLocation | null) => locationService.set(media.id, location),
    onSuccess: async (_, location) => {
      onChange(location);
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await queryClient.invalidateQueries({ queryKey: ["albums"] });
      showToast.success(t(location ? "Location saved." : "Location removed."));
      if (location) onSaved();
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
      <div ref={actionsRef} className="locations__actions" data-compact={compactActions}>
        <Button type="submit" disabled={!draft} busy={mutation.isPending}
          aria-label={saveLabel} title={saveLabel}>
          {!mutation.isPending && <Check size={20} aria-hidden="true" />}
          <span className="locations__action-label">{saveLabel}</span>
        </Button>
        {media.location && (
          <Button type="button" variant="secondary" disabled={mutation.isPending}
            aria-label={removeLabel} title={removeLabel} onClick={() => setConfirming("remove")}>
            <Trash2 size={20} aria-hidden="true" />
            <span className="locations__action-label">{removeLabel}</span>
          </Button>
        )}
        <Button type="button" variant="secondary" disabled={mutation.isPending}
          aria-label={cancelLabel} title={cancelLabel} onClick={onCancel}>
          <X size={20} aria-hidden="true" />
          <span className="locations__action-label">{cancelLabel}</span>
        </Button>
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
