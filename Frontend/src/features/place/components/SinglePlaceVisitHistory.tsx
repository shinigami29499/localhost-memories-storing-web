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
  onShowOnMap?: (visit: PlaceVisit) => void;
}

export function SinglePlaceVisitHistory({ placeId, onShowOnMap }: Props) {
  const { t } = useLocale();
  const [page, setPage] = useState(1);
  const history = usePlaceVisits(placeId, page, PAGE_SIZE);
  const removeVisit = useDeletePlaceVisit();
  const visits = history.data?.items ?? [];
  const total = history.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => setPage(1), [placeId]);
  useEffect(() => {
    if (history.data) setPage((current) => Math.min(current, totalPages));
  }, [history.data, totalPages]);

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
            visits={visits}
            onShowOnMap={onShowOnMap}
            showPlaceDetails={false}
            showVisitor
            showVisitorName
            onRemove={(visit) => void handleRemove(visit)}
            removingVisitId={removeVisit.isPending ? removeVisit.variables : null}
          />
          <Pagination page={currentPage} pageSize={PAGE_SIZE} total={total} itemLabel="visits" onPageChange={setPage} />
        </div>
      ) : <p>{t("No visits at this place yet.")}</p>}
    </section>
  );
}
