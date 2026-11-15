import { useEffect, useState, type ComponentType, type CSSProperties } from "react";
import { showToast } from "../../../components/ui";
import { useAuthStore } from "../../../store/authStore";
import { UserAvatar } from "../../../components/common/UserAvatar";
import type { PlaceDialogProps } from "./PlaceDialog";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { useLocale } from "../../../context/LocaleContext";
import { useUpdatePlaceVisit } from "../hooks/usePlaces";
import { StarRating } from "./StarRating";
import { Button } from "../../../components/ui";
import type { PlaceVisit } from "../types";

export interface PlaceVisitHistoryProps {
  DialogComponent: ComponentType<PlaceDialogProps>;
  visits: PlaceVisit[];
  showPlaceDetails?: boolean;
  showVisitor?: boolean;
  showVisitorName?: boolean;
  canEditVisits?: boolean;
  onRemove?: (visit: PlaceVisit) => Promise<void>;
  removingVisitId?: string | null;
  onShowOnMap?: (visit: PlaceVisit) => void;
}


export function usePlaceVisitHistorySharedController({ visits, showPlaceDetails = true, showVisitor = false, showVisitorName = false, canEditVisits = true, onRemove, removingVisitId, onShowOnMap, DialogComponent }: PlaceVisitHistoryProps) {
  const { language, t } = useLocale();
  const isAdmin = useAuthStore((state) => state.user?.role?.toLowerCase() === "admin");
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [now, setNow] = useState(() => Date.now());
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [removalBusy, setRemovalBusy] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<PlaceVisit | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editRating, setEditRating] = useState(0);
  const updateVisit = useUpdatePlaceVisit();

  useEffect(() => {
    if (!onRemove) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [onRemove]);

  const canRemove = (visit: PlaceVisit, time: number) =>
    isAdmin || time - new Date(visit.visitedAt).getTime() <= 24 * 60 * 60 * 1000;
  const showColumnHeadings = showPlaceDetails && showVisitor && showVisitorName;

  const requestRemove = (visit: PlaceVisit) => {
    const time = Date.now();
    if (!canRemove(visit, time)) {
      setNow(time);
      return;
    }
    setConfirmingRemoval(true);
  };

  const confirmRemove = async (visit: PlaceVisit) => {
    if (!canRemove(visit, Date.now())) {
      setNow(Date.now());
      showToast.error(t("Check ins older than one day cannot be removed."));
      return;
    }
    setRemovalBusy(true);
    try {
      await onRemove?.(visit);
      setSelectedVisit(null);
      setConfirmingRemoval(false);
    } catch {
      showToast.error(t("Could not complete this action. Please retry."));
    } finally {
      setRemovalBusy(false);
    }
  };
  return { language, t, currentUserId, now, confirmingRemoval, setConfirmingRemoval, removalBusy, selectedVisit, setSelectedVisit, editNote, setEditNote, editRating, setEditRating, updateVisit, canRemove, showColumnHeadings, requestRemove, confirmRemove };
}
