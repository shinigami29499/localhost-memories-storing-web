import { Star } from "../../../components/animate-ui/icons/star";
import { useLocale } from "../../../context/LocaleContext";

interface Props {
  value: number;
  onChange?: (rating: number) => void;
  disabled?: boolean;
  filledOnly?: boolean;
  hideReadout?: boolean;
  size?: "sm" | "md" | "lg";
}

const STARS = [1, 2, 3, 4, 5];

export function StarRating({ value, onChange, disabled, filledOnly = false, hideReadout = false, size = "md" }: Props) {
  const { t } = useLocale();
  const label = value > 0
    ? t("Rated {rating} of 5 stars", { rating: value })
    : t("Not rated yet");

  if (!onChange) {
    return (
      <span className={`star-rating star-rating--${size}`} role="img" aria-label={label} title={label}>
        {STARS.filter((star) => !filledOnly || star <= value).map((star) => {
          const fill = Math.max(0, Math.min(1, value - star + 1));
          const isFull = fill === 1;
          return (
            <span key={star} className="star-rating__icon">
              <Star className="star-rating__star" data-filled={isFull} fill={isFull ? "currentColor" : "none"} aria-hidden="true" />
              {fill > 0 && fill < 1 ? (
                <Star
                  className="star-rating__star star-rating__partial"
                  style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
                  fill="currentColor"
                  aria-hidden="true"
                />
              ) : null}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <span className={`star-rating star-rating--${size} star-rating--interactive`} role="group" aria-label={t("Rating")}>
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          className="star-rating__star star-rating__button"
          data-filled={star <= value}
          disabled={disabled}
          aria-pressed={star <= value}
          aria-label={t("Rate {rating} of 5 stars", { rating: star })}
          title={t("Rate {rating} of 5 stars", { rating: star })}
          onClick={() => onChange(value === star ? 0 : star)}
        >
          <Star fill={star <= value ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      ))}
      {!hideReadout && <span className="star-rating__readout">{label}</span>}
    </span>
  );
}
