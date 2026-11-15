import { useEffect, useState, type ComponentType } from "react";
import { ErrorState, Spinner, showToast } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import { useLocale } from "@/context/LocaleContext";
import { useDeletePlaceVisit, usePlaceVisits } from "@/features/place/hooks/usePlaces";
import { MobilePlaceVisitHistory as PlaceVisitHistoryShared } from "./MobilePlaceVisitHistory";
import type { PlaceDialogProps } from "@/features/place/components/PlaceDialog";
import type { PlaceVisit } from "@/features/place/types";

const PAGE_SIZE = 5;

export interface SinglePlaceVisitHistoryProps {
  placeId: string;
  onShowOnMap?: (visit: PlaceVisit) => void;
  DialogComponent: ComponentType<PlaceDialogProps>;
}

import { useSinglePlaceVisitHistorySharedController } from "@/features/place/components/useSinglePlaceVisitHistorySharedController";

export function MobileSinglePlaceVisitHistory(props: SinglePlaceVisitHistoryProps) {
  const { placeId, onShowOnMap, DialogComponent } = props;
  const { t, page, setPage, history, removeVisit, visits, total, currentPage, handleRemove } = useSinglePlaceVisitHistorySharedController(props);

  return (
    <section className="place__place-history" aria-label={t("Visit history")}>
      {history.isError ? (
        <ErrorState message="Could not load visit history." onRetry={() => void history.refetch()} />
      ) : history.isPending ? (
        <Spinner />
      ) : visits.length ? (
        <div>
          <PlaceVisitHistoryShared
            DialogComponent={DialogComponent}
            visits={visits}
            onShowOnMap={onShowOnMap}
            showPlaceDetails={false}
            showVisitor
            showVisitorName
            onRemove={handleRemove}
            removingVisitId={removeVisit.isPending ? removeVisit.variables : null}
          />
          <Pagination page={currentPage} pageSize={PAGE_SIZE} total={total} itemLabel="visits" onPageChange={setPage} />
        </div>
      ) : <p>{t("No visits at this place yet.")}</p>}
    </section>
  );
}
