import { useEffect, useState, type CSSProperties } from "react";
import { showToast } from "../../../components/ui";
import { useAuthStore } from "../../../store/authStore";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { PlaceDialog } from "./PlaceDialog";
import { AnimateIcon } from "../../../components/animate-ui/icons/icon";
import { useLocale } from "../../../context/LocaleContext";
import { useUpdatePlaceVisit } from "../hooks/usePlaces";
import { StarRating } from "./StarRating";
import { Button } from "../../../components/ui";
import type { PlaceVisit } from "../types";

interface Props {
  visits: PlaceVisit[];
  showPlaceDetails?: boolean;
  showVisitor?: boolean;
  showVisitorName?: boolean;
  canEditVisits?: boolean;
  onRemove?: (visit: PlaceVisit) => Promise<void>;
  removingVisitId?: string | null;
  onShowOnMap?: (visit: PlaceVisit) => void;
}

export function PlaceVisitHistory({ visits, showPlaceDetails = true, showVisitor = false, showVisitorName = false, canEditVisits = true, onRemove, removingVisitId, onShowOnMap }: Props) {
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

  return (
    <>
    <ol className={`place__history${showVisitor ? " place__history--visitor" : ""}${showVisitorName ? " place__history--visitor-name" : ""}${showPlaceDetails && showVisitor ? " place__history--place-visitor" : ""}`}>
      {visits.map((visit) => (
        <li className="place__history-item" key={visit.id}>
          <button
            type="button"
            className="place__history-select"
            aria-label={t("View check-in details for {place}", { place: visit.placeName })}
            onClick={() => { setConfirmingRemoval(false); setEditNote(visit.note); setEditRating(visit.rating); setSelectedVisit(visit); }}
          />
          {showPlaceDetails && (
            <>
              <span className="place__chip place__history-icon" style={{ "--marker-color": visit.markerColor } as CSSProperties} aria-hidden="true">{visit.markerIcon}</span>
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
          {showVisitorName && <StarRating value={visit.rating} size="sm" />}
          <time dateTime={visit.visitedAt}>
            <span className="place__history-date" data-column="date">
              {new Date(visit.visitedAt).toLocaleDateString(language, { month: "short", day: "2-digit", year: "numeric" })}
            </span>
            <span data-column="time">
              {new Date(visit.visitedAt).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
            </span>
          </time>
        </li>
      ))}
    </ol>
    {selectedVisit && (
      <PlaceDialog
        className="place__dialog--visit"
        title={selectedVisit.placeName}
        subtitle={t("by {user}", { user: selectedVisit.username })}
        subtitleSecondLine={new Date(selectedVisit.visitedAt).toLocaleString(language, { dateStyle: "long", timeStyle: "short" })}
        icon={onShowOnMap ? (
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="place__visit-marker-action" aria-label={t("Show on map")} title={t("Show on map")}
              onClick={() => onShowOnMap(selectedVisit)}>
              <span className="place__chip place__history-icon" style={{ "--marker-color": selectedVisit.markerColor } as CSSProperties} aria-hidden="true">{selectedVisit.markerIcon}</span>
            </button>
          </AnimateIcon>
        ) : <span className="place__chip place__history-icon" style={{ "--marker-color": selectedVisit.markerColor } as CSSProperties} aria-hidden="true">{selectedVisit.markerIcon}</span>}
        onClose={() => { setConfirmingRemoval(false); setSelectedVisit(null); }}
      >
        <form className="place__visit-detail place__visit-edit" onSubmit={(event) => {
          event.preventDefault();
          void updateVisit.mutateAsync({ visitId: selectedVisit.id, note: editNote, rating: editRating }).then((updated) => {
            setSelectedVisit(updated);
            setEditNote(updated.note);
            setEditRating(updated.rating);
          });
        }}>
          {selectedVisit.placeAddress && <p>{selectedVisit.placeAddress}</p>}
          {selectedVisit.userId === currentUserId && canEditVisits ? (
            <>
              <textarea aria-label={t("Note")} placeholder={t("Write something in your mind...")} value={editNote} rows={3} maxLength={2000} onChange={(event) => setEditNote(event.target.value)} />
              <div className="place__visit-edit-rating"><StarRating value={editRating} onChange={setEditRating} size="lg" hideReadout /></div>
            </>
          ) : (
            <>
              {selectedVisit.note && <p className="place__note"><strong>{t("Note")}:</strong><span>{selectedVisit.note}</span></p>}
              <StarRating value={selectedVisit.rating} size="sm" />
              {!selectedVisit.note && selectedVisit.rating === 0 && <p className="place__visit-no-review">{t("No review yet")}</p>}
            </>
          )}
          {selectedVisit.userId === currentUserId && (onRemove || canEditVisits) && (
          <div className="dialog-actions place__visit-actions">
          {confirmingRemoval ? <>
            <Button type="button" variant="danger" className="dialog-action dialog-action--danger" autoFocus disabled={removalBusy || removingVisitId === selectedVisit.id}
              onClick={() => setConfirmingRemoval(false)}>{t("Cancel")}</Button>
            <Button type="button" variant="danger" className="dialog-action dialog-action--danger-confirm place__visit-remove-confirm" busy={removalBusy || removingVisitId === selectedVisit.id}
              onClick={() => void confirmRemove(selectedVisit)}>{t("Yes, remove checkin!")}</Button>
          </> : <>
          {onRemove && <Button type="button" variant="danger" className="dialog-action dialog-action--danger place__visit-remove"
            title={t(canRemove(selectedVisit, now) ? "Remove this check in" : "Check ins older than one day cannot be removed.")}
            disabled={removingVisitId === selectedVisit.id || !canRemove(selectedVisit, now)}
            busy={removingVisitId === selectedVisit.id}
            onClick={() => requestRemove(selectedVisit)}>
            {t("Delete")}
          </Button>}
          {canEditVisits && <Button type="submit" className="dialog-action dialog-action--normal" busy={updateVisit.isPending}>{t("Save changes")}</Button>}
          </>}
          </div>
          )}
          {confirmingRemoval && (
            <p className="dialog-actions__note">{t("Remove your check-in at “{name}” on {date}? Its note and rating will also be removed.", {
              name: selectedVisit.placeName,
              date: new Date(selectedVisit.visitedAt).toLocaleString(language),
            })}</p>
          )}
        </form>
      </PlaceDialog>
    )}
    </>
  );
}
