import { useLocale } from "../../../context/LocaleContext";
import type { FoodPlaceVisit } from "../types";

interface Props {
  visits: FoodPlaceVisit[];
}

export function FoodVisitHistory({ visits }: Props) {
  const { language } = useLocale();

  return (
    <ol className="food__history">
      {visits.map((visit) => (
        <li className="food__history-item" key={visit.id}>
          <span className="food__history-icon" aria-hidden="true">{visit.markerIcon}</span>
          <div className="food__history-details">
            <strong>{visit.foodPlaceName}</strong>
            {visit.foodPlaceAddress && <small>{visit.foodPlaceAddress}</small>}
          </div>
          <time dateTime={visit.visitedAt}>
            {new Date(visit.visitedAt).toLocaleString(language, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
        </li>
      ))}
    </ol>
  );
}
