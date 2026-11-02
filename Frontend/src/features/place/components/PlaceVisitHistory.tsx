import { useEffect, useState, type CSSProperties } from "react";
import { Trash2 } from "../../../components/animate-ui/icons/trash-2";
import { LoaderCircle } from "../../../components/animate-ui/icons/loader-circle";
import { ConfirmationDialog } from "../../../components/ui";
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
  onRemove?: (visit: PlaceVisit) => void;
  removingVisitId?: string | null;
  onShowOnMap?: (visit: PlaceVisit) => void;
}

export function PlaceVisitHistory({ visits, showPlaceDetails = true, showVisitor = false, showVisitorName = false, canEditVisits = true, onRemove, removingVisitId, onShowOnMap }: Props) {
  const { language, t } = useLocale();
  const isAdmin = useAuthStore((state) => state.user?.role?.toLowerCase() === "admin");
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [now, setNow] = useState(() => Date.now());
  const [visitToRemove, setVisitToRemove] = useState<PlaceVisit | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<PlaceVisit | null>(null);
  const [editingVisit, setEditingVisit] = useState<PlaceVisit | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editRating, setEditRating] = useState(0);
  const updateVisit = useUpdatePlaceVisit();

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
    {selectedVisit && !editingVisit && (
      <PlaceDialog
        className="place__dialog--visit"
        title={selectedVisit.placeName}
        subtitle={t("by {user}", { user: selectedVisit.username })}
        subtitleSecondLine={new Date(selectedVisit.visitedAt).toLocaleString(language, { dateStyle: "full", timeStyle: "short" })}
        icon={onShowOnMap ? (
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="place__visit-marker-action" aria-label={t("Show on map")} title={t("Show on map")}
              onClick={() => onShowOnMap(selectedVisit)}>
              <span className="place__chip place__history-icon" style={{ "--marker-color": selectedVisit.markerColor } as CSSProperties} aria-hidden="true">{selectedVisit.markerIcon}</span>
            </button>
          </AnimateIcon>
        ) : <span className="place__chip place__history-icon" style={{ "--marker-color": selectedVisit.markerColor } as CSSProperties} aria-hidden="true">{selectedVisit.markerIcon}</span>}
        hideClose
        onClose={() => setSelectedVisit(null)}
      >
        <div className="place__visit-detail">
          {selectedVisit.placeAddress && <p>{selectedVisit.placeAddress}</p>}
          {selectedVisit.note ? (
            <p className="place__note"><strong>{t("Note")}:</strong><span>{selectedVisit.note}</span></p>
          ) : null}
          <StarRating value={selectedVisit.rating} size="sm" />
          {!selectedVisit.note && selectedVisit.rating === 0 && (
            <p className="place__visit-no-review">{t("No review yet")}</p>
          )}
          {canEditVisits && selectedVisit.userId === currentUserId && (
          <Button type="button" onClick={() => {
              setEditNote(selectedVisit.note);
              setEditRating(selectedVisit.rating);
              setEditingVisit(selectedVisit);
            }}>{t("Edit check-in")}</Button>
          )}
        </div>
      </PlaceDialog>
    )}
    {editingVisit && (
      <PlaceDialog
        className="place__dialog--visit-edit"
        title={editingVisit.placeName}
        subtitle={t("by {user}", { user: editingVisit.username })}
        icon={<span className="place__chip place__history-icon" style={{ "--marker-color": editingVisit.markerColor } as CSSProperties} aria-hidden="true">{editingVisit.markerIcon}</span>}
        hideClose
        onClose={() => setEditingVisit(null)}
      >
        <form className="place__visit-edit" onSubmit={(event) => {
          event.preventDefault();
          void updateVisit.mutateAsync({ visitId: editingVisit.id, note: editNote, rating: editRating }).then((updated) => {
            setSelectedVisit(updated);
            setEditingVisit(null);
          });
        }}>
          <textarea aria-label={t("Note")} placeholder={t("Write something in your mind...")} value={editNote} rows={7} maxLength={2000} onChange={(event) => setEditNote(event.target.value)} />
          <div className="place__visit-edit-rating">
            <StarRating value={editRating} onChange={setEditRating} size="lg" hideReadout />
          </div>
          <Button type="submit" busy={updateVisit.isPending}>{t("Save changes")}</Button>
        </form>
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
