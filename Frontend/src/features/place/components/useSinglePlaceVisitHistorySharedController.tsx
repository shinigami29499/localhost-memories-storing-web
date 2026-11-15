import { useEffect, useState, type ComponentType } from "react";
import { ErrorState, Spinner, showToast } from "../../../components/ui";
import { Pagination } from "../../../components/ui/Pagination";
import { useLocale } from "../../../context/LocaleContext";
import { useDeletePlaceVisit, usePlaceVisits } from "../hooks/usePlaces";
import { PlaceVisitHistoryShared } from "./PlaceVisitHistoryShared";
import type { PlaceDialogProps } from "./PlaceDialog";
import type { PlaceVisit } from "../types";

const PAGE_SIZE = 5;

export interface SinglePlaceVisitHistoryProps {
  placeId: string;
  onShowOnMap?: (visit: PlaceVisit) => void;
  DialogComponent: ComponentType<PlaceDialogProps>;
}


export function useSinglePlaceVisitHistorySharedController({ placeId, onShowOnMap, DialogComponent }: SinglePlaceVisitHistoryProps) {
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
    await removeVisit.mutateAsync(visit.id);
    showToast.delete(t("Check in removed."));
  };
  return { t, page, setPage, history, removeVisit, visits, total, currentPage, handleRemove };
}
