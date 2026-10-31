import { XIcon } from "../../../components/animate-ui/icons/x";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { useLocale } from "../../../context/LocaleContext";
import type { FoodPlaceVisit } from "../types";

interface Props {
  visits: FoodPlaceVisit[];
  onRemove?: (visit: FoodPlaceVisit) => void;
  removingVisitId?: string | null;
}

export function VisitHistoryLimited({ visits, onRemove, removingVisitId }: Props) {
  const { language, t } = useLocale();

  return (
    <ol className="food__history">
      {visits.map((visit) => (
        <li className="food__history-item" key={visit.id}>
          <time dateTime={visit.visitedAt}>
            <span className="food__history-date">
              {new Date(visit.visitedAt).toLocaleDateString(language, { dateStyle: "medium" })}
            </span>{" "}
            <span>
              {new Date(visit.visitedAt).toLocaleTimeString(language, { timeStyle: "short" })}
            </span>
          </time>
          {onRemove && (
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button
                type="button"
                className="food__history-remove"
                aria-label={t("Remove this check in")}
                title={t("Remove this check in")}
                disabled={removingVisitId === visit.id}
                onClick={() => onRemove(visit)}
              >
                <XIcon size={16} aria-hidden="true" />
              </button>
            </AnimateIcon>
          )}
        </li>
      ))}
    </ol>
  );
}