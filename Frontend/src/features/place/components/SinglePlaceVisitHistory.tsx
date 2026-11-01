import { useEffect, useState } from "react";
import { ErrorState, Spinner, showToast } from "../../../components/ui";
import { Pagination } from "../../../components/ui/Pagination";
import { ApiError } from "../../../services/api";
import { useLocale } from "../../../context/LocaleContext";
import { useDeletePlaceVisit, usePlaceVisits } from "../hooks/usePlaces";
import { PlaceVisitHistory } from "./PlaceVisitHistory";
import type { PlaceVisit } from "../types";

const PAGE_SIZE = 5;

interface Props {
  placeId: string;
}

export function SinglePlaceVisitHistory({ placeId }: Props) {
  const { t } = useLocale();
  const history = usePlaceVisits(placeId);
  const removeVisit = useDeletePlaceVisit();
  const [page, setPage] = useState(1);
  const visits = history.data ?? [];
  const totalPages = Math.max(1, Math.ceil(visits.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleVisits = visits.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => setPage(1), [placeId]);
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);

  const handleRemove = async (visit: PlaceVisit) => {
    try {
      await removeVisit.mutateAsync(visit.id);
      showToast.delete(t("Check in removed."));
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not remove this check in."));
    }
  };

  return (
    <section className="place__place-history" aria-label={t("Visit history")}>
      {history.isError ? (
        <ErrorState message="Could not load visit history." onRetry={() => void history.refetch()} />
      ) : history.isPending ? (
        <Spinner />
      ) : visits.length ? (
        <div>
          <PlaceVisitHistory
            visits={visibleVisits}
            showPlaceDetails={false}
            showVisitor
            showVisitorName
            onRemove={(visit) => void handleRemove(visit)}
            removingVisitId={removeVisit.isPending ? removeVisit.variables : null}
          />
          {totalPages > 1 && (
            <Pagination page={currentPage} pageSize={PAGE_SIZE} total={visits.length} itemLabel="visits" onPageChange={setPage} />
          )}
        </div>
      ) : (
        <p className="place__hint">{t("No visits at this place yet.")}</p>
      )}
    </section>
  );
}
