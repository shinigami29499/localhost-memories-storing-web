import { useState, type CSSProperties } from "react";
import { Button, Input } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { BookmarkIcon } from "../../../components/animate-ui/icons/bookmark";
import { UploadIcon } from "../../../components/animate-ui/icons/upload";
import { XIcon } from "../../../components/animate-ui/icons/x";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import { PlaceMarkerCombobox } from "./PlaceMarkerCombobox";
import { PlaceImagePicker } from "./PlaceImagePicker";
import {
  PLACE_MARKER_COLORS,
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
  const busy = saving || deleting === true;
  const setMediaIds = (mediaIds: string[]) => onChange({ ...values, mediaIds });

  return (
    <form
      className="place__form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
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

      {values.mediaIds.length > 0 && (
        <div className="place__field">
          <span>{t("Photos")}</span>
          <ul className="place__photo-list" aria-label={t("Photos")}>
            {values.mediaIds.map((mediaId, index) => (
              <li key={mediaId} className="place__photo-thumb">
                <img src={mediaPreviewUrl(mediaId)} alt="" loading="lazy" />
                {index === 0 ? (
                  <span className="place__photo-cover">{t("Cover")}</span>
                ) : (
                  <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                    <button
                      type="button"
                      className="place__photo-action place__photo-action--cover"
                      aria-label={t("Set photo {index} as cover", { index: index + 1 })}
                      title={t("Set as cover")}
                      disabled={busy}
                      onClick={() => setMediaIds([mediaId, ...values.mediaIds.filter((id) => id !== mediaId)])}
                    >
                      <BookmarkIcon size={14} aria-hidden="true" />
                    </button>
                  </AnimateIcon>
                )}
                <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                  <button
                    type="button"
                    className="place__photo-action place__photo-action--remove"
                    aria-label={t("Remove photo {index}", { index: index + 1 })}
                    title={t("Remove photo")}
                    disabled={busy}
                    onClick={() => setMediaIds(values.mediaIds.filter((id) => id !== mediaId))}
                  >
                    <XIcon size={14} aria-hidden="true" />
                  </button>
                </AnimateIcon>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="place__field">
        <span>{t("Photos")}</span>
        <Button type="button" className="place__choose-photos" disabled={busy} onClick={() => setPickingImages(true)}>
          <UploadIcon size={18} aria-hidden="true" />
          {t("Choose photos")}
        </Button>
      </div>
      <label className="place__field">
        <span>{t("Note")}</span>
        <textarea className="place__textarea" value={values.note} disabled={busy}
          onChange={(event) => onChange({ ...values, note: event.target.value })} />
      </label>
      {pickingImages && <PlaceImagePicker selectedIds={values.mediaIds} onConfirm={setMediaIds} onClose={() => setPickingImages(false)} />}

      {error && <p className="place__form-error" role="alert">{error}</p>}

      <div className="place__form-actions">
        <div className="place__form-actions-primary">
          <Button type="submit" className="place__save-action" busy={saving} disabled={!coordinate || busy}>
            {t(isNew ? "Save place" : "Save changes")}
          </Button>
          <Button type="button" className="place__cancel-action" variant="danger" disabled={busy} onClick={onCancel}>
            {t("Cancel")}
          </Button>
        </div>
        {onDelete && (
          <Button type="button" variant="danger" busy={deleting} disabled={busy} onClick={onDelete}>
            {t("Delete")}
          </Button>
        )}
      </div>
    </form>
  );
}
