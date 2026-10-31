import { useEffect, useState } from "react";
import { Trash2 } from "../../../components/animate-ui/icons/trash-2";
import { LoaderCircle } from "../../../components/animate-ui/icons/loader-circle";
import { ConfirmationDialog } from "../../../components/ui";
import { useAuthStore } from "../../../store/authStore";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { useLocale } from "../../../context/LocaleContext";
import type { FoodPlaceVisit } from "../types";

interface Props {
  visits: FoodPlaceVisit[];
  showPlaceDetails?: boolean;
  onRemove?: (visit: FoodPlaceVisit) => void;
  removingVisitId?: string | null;
}

export function FoodVisitHistory({ visits, showPlaceDetails = true, onRemove, removingVisitId }: Props) {
  const { language, t } = useLocale();
  const isAdmin = useAuthStore((state) => state.user?.role?.toLowerCase() === "admin");
  const [now, setNow] = useState(() => Date.now());
  const [visitToRemove, setVisitToRemove] = useState<FoodPlaceVisit | null>(null);

  useEffect(() => {
    if (!onRemove) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [onRemove]);

  const canRemove = (visit: FoodPlaceVisit, time: number) =>
    isAdmin || time - new Date(visit.visitedAt).getTime() <= 24 * 60 * 60 * 1000;

  const requestRemove = (visit: FoodPlaceVisit) => {
    const time = Date.now();
    if (!canRemove(visit, time)) {
      setNow(time);
      return;
    }
    if (time - new Date(visit.visitedAt).getTime() <= 5 * 60 * 1000) onRemove?.(visit);
    else setVisitToRemove(visit);
  };

  return (
    <>
    <ol className="food__history">
      {visits.map((visit) => (
        <li className="food__history-item" key={visit.id}>
          {showPlaceDetails && (
            <>
              <span className="food__history-icon" aria-hidden="true">{visit.markerIcon}</span>
              <div className="food__history-details">
                <strong>{visit.foodPlaceName}</strong>
                {visit.foodPlaceAddress && <small>{visit.foodPlaceAddress}</small>}
              </div>
            </>
          )}
          <time dateTime={visit.visitedAt}>
            {showPlaceDetails ? (
              new Date(visit.visitedAt).toLocaleString(language, {
                dateStyle: "medium",
                timeStyle: "short",
              })
            ) : (
              <>
                <span className="food__history-date">
                  {new Date(visit.visitedAt).toLocaleDateString(language, { dateStyle: "medium" })}
                </span>{" "}
                <span>
                  {new Date(visit.visitedAt).toLocaleTimeString(language, { timeStyle: "short" })}
                </span>
              </>
            )}
          </time>
          {onRemove && (
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button
                type="button"
                className="food__history-remove"
                aria-label={t("Remove this check in")}
                title={t(canRemove(visit, now) ? "Remove this check in" : "Check ins older than one day cannot be removed.")}
                disabled={removingVisitId === visit.id || !canRemove(visit, now)}
                onClick={() => requestRemove(visit)}
              >
                {removingVisitId === visit.id ? <LoaderCircle size={16} className="spinner__wheel" aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
              </button>
            </AnimateIcon>
          )}
        </li>
      ))}
    </ol>
    {visitToRemove && (
      <ConfirmationDialog
        title="Remove this check in?"
        danger
        onConfirm={async () => {
          if (canRemove(visitToRemove, Date.now())) onRemove?.(visitToRemove);
          else setNow(Date.now());
        }}
        onClose={() => setVisitToRemove(null)}
      >
        <p>{t("This check in will be removed from your visit history.")}</p>
      </ConfirmationDialog>
    )}
    </>
  );
}
