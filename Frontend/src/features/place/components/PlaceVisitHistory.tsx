import { useEffect, useState } from "react";
import { Trash2 } from "../../../components/animate-ui/icons/trash-2";
import { LoaderCircle } from "../../../components/animate-ui/icons/loader-circle";
import { ConfirmationDialog } from "../../../components/ui";
import { useAuthStore } from "../../../store/authStore";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { PlaceDialog } from "./PlaceDialog";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { useLocale } from "../../../context/LocaleContext";
import type { PlaceVisit } from "../types";

interface Props {
  visits: PlaceVisit[];
  showPlaceDetails?: boolean;
  showVisitor?: boolean;
  showVisitorName?: boolean;
  onRemove?: (visit: PlaceVisit) => void;
  removingVisitId?: string | null;
}

export function PlaceVisitHistory({ visits, showPlaceDetails = true, showVisitor = false, showVisitorName = false, onRemove, removingVisitId }: Props) {
  const { language, t } = useLocale();
  const isAdmin = useAuthStore((state) => state.user?.role?.toLowerCase() === "admin");
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [now, setNow] = useState(() => Date.now());
  const [visitToRemove, setVisitToRemove] = useState<PlaceVisit | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<PlaceVisit | null>(null);

  useEffect(() => {
    if (!onRemove) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [onRemove]);

  const canRemove = (visit: PlaceVisit, time: number) =>
    isAdmin || time - new Date(visit.visitedAt).getTime() <= 24 * 60 * 60 * 1000;

  const requestRemove = (visit: PlaceVisit) => {
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
    <ol className={`place__history${showVisitor ? " place__history--visitor" : ""}${showVisitorName ? " place__history--visitor-name" : ""}${showPlaceDetails && showVisitor ? " place__history--place-visitor" : ""}`}>
      {visits.map((visit) => (
        <li className="place__history-item" key={visit.id}>
          <button
            type="button"
            className="place__history-select"
            aria-label={t("View check-in details for {place}", { place: visit.placeName })}
            onClick={() => setSelectedVisit(visit)}
          />
          {showPlaceDetails && (
            <>
              <span className="place__history-icon" aria-hidden="true">{visit.markerIcon}</span>
              <div className="place__history-details">
                <strong>{visit.placeName}</strong>
                {visit.placeAddress && <small>{visit.placeAddress}</small>}
              </div>
            </>
          )}
          {showVisitor && (
            showVisitorName ? (
              <>
                <UserAvatar user={{ id: visit.userId, username: visit.username, avatarSeed: visit.avatarSeed }} className="place__history-visitor-avatar" />
                <span className="place__history-visitor-name" title={visit.username}>{visit.username}</span>
              </>
            ) : (
              <div className="place__history-visitor" title={visit.username}>
              <UserAvatar user={{ id: visit.userId, username: visit.username, avatarSeed: visit.avatarSeed }} className="place__history-visitor-avatar" />
              </div>
            )
          )}
          <time dateTime={visit.visitedAt}>
            <span className="place__history-date" data-column="date">
              {new Date(visit.visitedAt).toLocaleDateString(language, { dateStyle: "medium" })}
            </span>
            <span data-column="time">
              {new Date(visit.visitedAt).toLocaleTimeString(language, { timeStyle: "short" })}
            </span>
          </time>
          {onRemove && visit.userId === currentUserId && (
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
              <button
                type="button"
                className="place__history-remove"
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
    {selectedVisit && (
      <PlaceDialog
        title={t("Check-in details")}
        subtitle={selectedVisit.placeName}
        icon={<span className="place__history-icon" aria-hidden="true">{selectedVisit.markerIcon}</span>}
        onClose={() => setSelectedVisit(null)}
      >
        <div className="place__visit-detail">
          <div className="place__visit-detail-user">
            <UserAvatar user={{ id: selectedVisit.userId, username: selectedVisit.username, avatarSeed: selectedVisit.avatarSeed }} className="place__history-visitor-avatar" />
            <strong>{selectedVisit.username}</strong>
          </div>
          {selectedVisit.placeAddress && <p>{selectedVisit.placeAddress}</p>}
          <time dateTime={selectedVisit.visitedAt}>
            {new Date(selectedVisit.visitedAt).toLocaleString(language, { dateStyle: "full", timeStyle: "short" })}
          </time>
        </div>
      </PlaceDialog>
    )}
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
