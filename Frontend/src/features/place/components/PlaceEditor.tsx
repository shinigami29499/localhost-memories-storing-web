import { useState, type CSSProperties } from "react";
import { Button, Input } from "../../../components/ui";
import { UploadIcon } from "../../../components/animate-ui/icons/upload";
import { Plus } from "../../../components/animate-ui/icons/plus";
import { useLocale } from "../../../context/LocaleContext";
import { PlaceMarkerCombobox } from "./PlaceMarkerCombobox";
import { PhotoPicker } from "../../media/components/PhotoPicker";
import { usePreviewDrafts } from "../../media/hooks/usePreviewDrafts";
import {
  PLACE_MARKER_COLORS,
  MAX_PLACE_IMAGES,
  type PlaceCoordinate,
  type SavePlaceInput,
} from "../types";

export type PlaceFormValues = Omit<SavePlaceInput, "latitude" | "longitude">;

interface Props {
  values: PlaceFormValues;
  coordinate: PlaceCoordinate | null;
  saving: boolean;
  deleting?: boolean;
  isNew: boolean;
  error: string | null;
  onChange: (values: PlaceFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const MAX_NAME_LENGTH = 120;

export function PlaceEditor({
  values, coordinate, saving, deleting, isNew, error, onChange, onSubmit, onCancel, onDelete,
}: Props) {
  const { t } = useLocale();
  const [pickingImages, setPickingImages] = useState(false);
  const { register: registerDraft, retain: retainDrafts } = usePreviewDrafts();
  const busy = saving || deleting === true || pickingImages;
  const setMediaIds = (mediaIds: string[]) => onChange({ ...values, mediaIds });

  return (
    <form
      className="place__form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy) onSubmit();
      }}
    >
      <label className="place__field">
        <span>{t("Place name")}</span>
        <Input
          value={values.name}
          onChange={(name) => onChange({ ...values, name })}
          maxLength={MAX_NAME_LENGTH}
          required
          placeholder={t("Noodle shop on the corner")}
        />
      </label>

      <div className="place__field">
        <Button type="button" className="dialog-action dialog-action--normal place__choose-photos" disabled={busy} onClick={() => setPickingImages(true)}>
          <UploadIcon size={18} aria-hidden="true" />
          {t("Choose photos")}
        </Button>
      </div>

      <div className="place__field">
        <PlaceMarkerCombobox
          value={values.markerIcon}
          disabled={busy}
          onChange={(markerIcon) => onChange({ ...values, markerIcon })}
        />
      </div>

      <div className="place__field">
        <span>{t("Marker color")}</span>
        <div className="place__color-grid" role="group" aria-label={t("Marker color")}>
          {PLACE_MARKER_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className="place__color-option"
              style={{ "--marker-color": color } as CSSProperties}
              aria-pressed={values.markerColor === color}
              aria-label={t("Select {color}", { color })}
              title={color}
              disabled={busy}
              onClick={() => onChange({ ...values, markerColor: color })}
            />
          ))}
        </div>
      </div>

      {pickingImages && <PhotoPicker
        selectedId={values.mediaIds[0] ?? null}
        selectedIds={values.mediaIds}
        maxImages={MAX_PLACE_IMAGES}
        onConfirm={(image, previousImage) => {
          if (image) {
            const mediaIds = [image.id, ...values.mediaIds.filter((id) =>
              id !== image.id && !(previousImage?.isPreviewOnly && id === previousImage.id))];
            setMediaIds(mediaIds);
            retainDrafts(mediaIds);
          }
        }}
        onUploadedPreview={registerDraft}
        onClose={() => setPickingImages(false)}
      />}

      {error && <p className="place__form-error" role="alert">{error}</p>}

      <div className="place__form-actions">
        <div className="place__form-actions-primary dialog-actions">
          <Button type="button" className="dialog-action dialog-action--danger place__cancel-action" variant="danger" disabled={busy} onClick={onCancel}>
            {t("Cancel")}
          </Button>
          <Button type="submit" className="dialog-action dialog-action--normal place__save-action" busy={saving} disabled={!coordinate || busy}>
            {isNew ? <><Plus size={18} aria-hidden="true" />{t("Add")}</> : t("Save changes")}
          </Button>
        </div>
        {onDelete && (
          <Button type="button" variant="danger" className="dialog-action dialog-action--danger" busy={deleting} disabled={busy} onClick={onDelete}>
            {t("Delete")}
          </Button>
        )}
      </div>
    </form>
  );
}
