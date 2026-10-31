import { useId } from "react";
import { ErrorState, Spinner, showToast } from "../../../components/ui";
import { ApiError } from "../../../services/api";
import { useLocale } from "../../../context/LocaleContext";
import { useDeleteFoodPlaceVisit, useFoodPlaceVisitHistory } from "../hooks/useFoodPlaces";
import { FoodVisitHistory } from "./FoodVisitHistory";
import type { FoodPlaceVisit } from "../types";

interface Props {
  foodPlaceId: string;
}

export function FoodPlaceVisitHistory({ foodPlaceId }: Props) {
  const { t } = useLocale();
  const titleId = useId();
  const history = useFoodPlaceVisitHistory();
  const removeVisit = useDeleteFoodPlaceVisit();
  const visits = history.data?.filter((visit) => visit.foodPlaceId === foodPlaceId) ?? [];
  const handleRemove = async (visit: FoodPlaceVisit) => {
    try {
      await removeVisit.mutateAsync(visit.id);
      showToast.success(t("Check in removed."));
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not remove this check in."));
    }
  };

  return (
    <section className="food__place-history" aria-labelledby={titleId}>
      <h3 id={titleId}>{t("Your visit history")}</h3>
      {history.isError ? (
        <ErrorState message="Could not load visit history." onRetry={() => void history.refetch()} />
      ) : history.isPending ? (
        <Spinner />
      ) : visits.length ? (
        <FoodVisitHistory
          visits={visits}
          showPlaceDetails={false}
          onRemove={(visit) => void handleRemove(visit)}
          removingVisitId={removeVisit.isPending ? removeVisit.variables : null}
        />
      ) : (
        <p className="food__hint">{t("No visits at this place yet.")}</p>
      )}
    </section>
  );
}
