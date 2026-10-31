import { type CSSProperties } from "react";
import { Button, Input } from "../../../components/ui";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { BookmarkIcon } from "../../../components/animate-ui/icons/bookmark";
import { XIcon } from "../../../components/animate-ui/icons/x";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import { FoodMarkerCombobox } from "./FoodMarkerCombobox";
import { StarRating } from "./StarRating";
import {
  FOOD_MARKER_COLORS,
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
  onDelete?: () => void;
}

const MAX_NAME_LENGTH = 120;

export function FoodPlaceEditor({
  values, coordinate, saving, deleting, isNew, error, onChange, onSubmit, onCancel, onDelete,
}: Props) {
  const { t } = useLocale();
  const busy = saving || deleting === true;
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

      <div className="food__field">
        <FoodMarkerCombobox
          value={values.markerIcon}
          disabled={busy}
          onChange={(markerIcon) => onChange({ ...values, markerIcon })}
        />
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
              aria-label={t("Select {color}", { color })}
              title={color}
              disabled={busy}
              onClick={() => onChange({ ...values, markerColor: color })}
            />
          ))}
        </div>
      </div>

      {values.mediaIds.length > 0 && (
        <div className="food__field">
          <span>{t("Photos")}</span>
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
        </div>
      )}

      <div className="food__field food__rating-field">
        <span>{t("Rating")}</span>
        <StarRating
          value={values.rating}
          disabled={busy}
          size="lg"
          onChange={(rating) => onChange({ ...values, rating })}
        />
      </div>

      {error && <p className="food__form-error" role="alert">{error}</p>}

      <div className="food__form-actions">
        <div className="food__form-actions-primary">
          <Button type="submit" busy={saving} disabled={!coordinate || busy}>
            {t(isNew ? "Save place" : "Save changes")}
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
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
