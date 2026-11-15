import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, ErrorState, showToast } from "@/components/ui";
import { MobileConfirmationDialog as ConfirmationDialog } from "../gallery/MobileConfirmationDialog";
import { Check } from "@/components/animate-ui/icons/check";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { useLocale } from "@/context/LocaleContext";
import { locationService } from "@/features/locations/services/locationService";
import type { MediaFile, PickedLocation } from "@/features/media/types";

interface Props {
  media: MediaFile;
  draft: PickedLocation | null;
  onChange: (location: PickedLocation | null) => void;
  onSaved: () => void;
  onCancel: () => void;
}

import { useLocationEditorController } from "@/features/locations/components/useLocationEditorController";

export function MobileLocationEditor({ media, draft, onChange, onSaved, onCancel }: Props) {
  const { t, confirming, setConfirming, actionsRef, compactActions, saveLabel, removeLabel, cancelLabel, mutation, submit } = useLocationEditorController({ media, draft, onChange, onSaved, onCancel });

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
          confirmLabel={confirming === "save" ? "Save location" : "Remove location"}
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
