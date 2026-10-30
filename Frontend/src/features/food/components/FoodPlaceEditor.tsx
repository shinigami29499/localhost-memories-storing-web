import { useState, type CSSProperties } from "react";
import { Button, Input } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { BookmarkIcon } from "../../../components/animate-ui/icons/bookmark";
import { ImageIcon } from "../../../components/animate-ui/icons/image";
import { XIcon } from "../../../components/animate-ui/icons/x";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import { FoodImagePicker } from "./FoodImagePicker";
import { StarRating } from "./StarRating";
import {
  FOOD_MARKER_COLORS,
  FOOD_MARKER_ICONS,
  type FoodCoordinate,
  type SaveFoodPlaceInput,
} from "../types";

export type FoodPlaceFormValues = Omit<SaveFoodPlaceInput, "latitude" | "longitude">;

interface Props {
  values: FoodPlaceFormValues;
  coordinate: FoodCoordinate | null;
  saving: boolean;
  deleting?: boolean;
  isNew: boolean;
  error: string | null;
  onChange: (values: FoodPlaceFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onChangeLocation: () => void;
  onDelete?: () => void;
}

const MAX_NAME_LENGTH = 120;
const MAX_ADDRESS_LENGTH = 300;
const MAX_NOTE_LENGTH = 2000;

export function FoodPlaceEditor({
  values, coordinate, saving, deleting, isNew, error, onChange, onSubmit, onCancel, onChangeLocation, onDelete,
}: Props) {
  const { t } = useLocale();
  const busy = saving || deleting === true;
  const [choosingPhotos, setChoosingPhotos] = useState(false);
  const setMediaIds = (mediaIds: string[]) => onChange({ ...values, mediaIds });

  return (
    <form
      className="food__form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="food__field">
        <span>{t("Place name")}</span>
        <Input
          value={values.name}
          onChange={(name) => onChange({ ...values, name })}
          maxLength={MAX_NAME_LENGTH}
          required
          placeholder={t("Noodle shop on the corner")}
        />
      </label>

      <label className="food__field">
        <span>{t("Address")}</span>
        <Input
          value={values.address}
          onChange={(address) => onChange({ ...values, address })}
          maxLength={MAX_ADDRESS_LENGTH}
          autoComplete="street-address"
          placeholder={t("Street, city, or neighborhood")}
        />
      </label>

      <div className="food__field">
        <span>{t("Rating")}</span>
        <StarRating
          value={values.rating}
          disabled={busy}
          onChange={(rating) => onChange({ ...values, rating })}
        />
      </div>

      <label className="food__field">
        <span>{t("Note")}</span>
        <textarea
          className="food__textarea"
          value={values.note}
          maxLength={MAX_NOTE_LENGTH}
          rows={4}
          placeholder={t("What did you eat? What is worth ordering again?")}
          onChange={(event) => onChange({ ...values, note: event.target.value })}
        />
        <small>{t("{count} / {max} characters", { count: values.note.length, max: MAX_NOTE_LENGTH })}</small>
      </label>

      <div className="food__field">
        <span>{t("Marker icon")}</span>
        <div className="food__icon-grid" role="group" aria-label={t("Marker icon")}>
          {FOOD_MARKER_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              className="food__icon-option"
              aria-pressed={values.markerIcon === icon}
              aria-label={icon}
              title={icon}
              disabled={busy}
              onClick={() => onChange({ ...values, markerIcon: icon })}
            >
              <span aria-hidden="true">{icon}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="food__field">
        <span>{t("Marker color")}</span>
        <div className="food__color-grid" role="group" aria-label={t("Marker color")}>
          {FOOD_MARKER_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className="food__color-option"
              style={{ "--marker-color": color } as CSSProperties}
              aria-pressed={values.markerColor === color}
              aria-label={color}
              title={color}
              disabled={busy}
              onClick={() => onChange({ ...values, markerColor: color })}
            />
          ))}
        </div>
      </div>

      <div className="food__field">
        <span>{t("Photos")}</span>
        {values.mediaIds.length > 0 && (
          <ul className="food__photo-list" aria-label={t("Photos")}>
            {values.mediaIds.map((mediaId, index) => (
              <li key={mediaId} className="food__photo-thumb">
                <img src={mediaPreviewUrl(mediaId)} alt="" loading="lazy" />
                {index === 0 ? (
                  <span className="food__photo-cover">{t("Cover")}</span>
                ) : (
                  <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                    <button
                      type="button"
                      className="food__photo-action food__photo-action--cover"
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
                    className="food__photo-action food__photo-action--remove"
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
        )}
        <Button
          type="button"
          variant="secondary"
          className="food__photo-add"
          disabled={busy}
          onClick={() => setChoosingPhotos(true)}
        >
          <ImageIcon size={18} aria-hidden="true" />
          {t(values.mediaIds.length ? "Change photos" : "Add photos")}
        </Button>
        {choosingPhotos && (
          <FoodImagePicker
            selectedIds={values.mediaIds}
            onConfirm={setMediaIds}
            onClose={() => setChoosingPhotos(false)}
          />
        )}
      </div>

      <div className="food__coordinate-controls">
        <p className="food__coordinate-readout">
          {coordinate
            ? `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`
            : t("Click the map to place this marker.")}
        </p>
        {coordinate && (
          <Button type="button" variant="secondary" disabled={busy} onClick={onChangeLocation}>
            {t("Change location")}
          </Button>
        )}
      </div>

      {error && <p className="food__form-error" role="alert">{error}</p>}

      <div className="food__form-actions">
        <Button type="submit" busy={saving} disabled={!coordinate || busy}>
          {t(isNew ? "Save place" : "Save changes")}
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          {t("Cancel")}
        </Button>
        {onDelete && (
          <Button type="button" variant="danger" busy={deleting} disabled={busy} onClick={onDelete}>
            {t("Delete")}
          </Button>
        )}
      </div>
    </form>
  );
}
