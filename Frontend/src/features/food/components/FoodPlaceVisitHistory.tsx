import { useEffect, useId, useState } from "react";
import { ErrorState, Spinner, showToast } from "../../../components/ui";
import { Pagination } from "../../../components/ui/Pagination";
import { ApiError } from "../../../services/api";
import { useLocale } from "../../../context/LocaleContext";
import { useDeleteFoodPlaceVisit, useFoodPlaceVisitHistory } from "../hooks/useFoodPlaces";
import { FoodVisitHistory } from "./FoodVisitHistory";
import type { FoodPlaceVisit } from "../types";

const PAGE_SIZE = 5;

interface Props {
  foodPlaceId: string;
}

export function FoodPlaceVisitHistory({ foodPlaceId }: Props) {
  const { t } = useLocale();
  const titleId = useId();
  const history = useFoodPlaceVisitHistory();
  const removeVisit = useDeleteFoodPlaceVisit();
  const [page, setPage] = useState(1);
  const visits = history.data?.filter((visit) => visit.foodPlaceId === foodPlaceId) ?? [];
  const totalPages = Math.max(1, Math.ceil(visits.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleVisits = visits.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => setPage(1), [foodPlaceId]);
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);

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
        <div>
          <FoodVisitHistory
            visits={visibleVisits}
            showPlaceDetails={false}
            onRemove={(visit) => void handleRemove(visit)}
            removingVisitId={removeVisit.isPending ? removeVisit.variables : null}
          />
          {totalPages > 1 && (
            <Pagination page={currentPage} pageSize={PAGE_SIZE} total={visits.length} itemLabel="visits" onPageChange={setPage} />
          )}
        </div>
      ) : (
        <p className="food__hint">{t("No visits at this place yet.")}</p>
      )}
    </section>
  );
}
