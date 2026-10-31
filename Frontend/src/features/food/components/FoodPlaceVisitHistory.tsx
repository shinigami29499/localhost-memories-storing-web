import { useEffect, useId, useRef, useState } from "react";
import { ErrorState, Spinner, showToast } from "../../../components/ui";
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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const visits = history.data?.filter((visit) => visit.foodPlaceId === foodPlaceId) ?? [];
  const visibleVisits = visits.slice(0, visibleCount);
  const hasMore = visibleCount < visits.length;

  useEffect(() => {
    const zone = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!hasMore || !zone || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => count + PAGE_SIZE);
        }
      },
      { root: zone },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, visits.length]);

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
        <div className="food__history-scroll" ref={scrollRef}>
          <FoodVisitHistory
            visits={visibleVisits}
            showPlaceDetails={false}
            onRemove={(visit) => void handleRemove(visit)}
            removingVisitId={removeVisit.isPending ? removeVisit.variables : null}
          />
          {hasMore && <div ref={sentinelRef} className="food__history-sentinel" aria-hidden="true" />}
        </div>
      ) : (
        <p className="food__hint">{t("No visits at this place yet.")}</p>
      )}
    </section>
  );
}
