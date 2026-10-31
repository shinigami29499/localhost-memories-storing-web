import { startTransition, useCallback, useEffect, useRef, useState, useMemo, type CSSProperties } from "react";
import { ScrollProgress, ScrollProgressContainer, ScrollProgressProvider } from "@animate-ui/react/primitives/scroll-progress";
import {
  Button,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  Spinner,
  showToast,
} from "../../components/ui";
import { PageTransition } from "../../components/layout/PageTransition";
import { readPageTransitionEffect } from "../../utils/pageTransition";
import { useLocale } from "../../context/LocaleContext";
import { useAuthStore } from "../../store/authStore";
import { ApiError } from "../../services/api";
import { useHomeLocation } from "../../features/locations/hooks/useHomeLocation";
import { HomeLocationPhotoConfirmation } from "../../features/locations/components/HomeLocationPhotoConfirmation";
import { mediaPreviewUrl } from "../../utils/media";
import { FoodMap } from "../../features/food/components/FoodMap";
import { FoodPlaceDialog } from "../../features/food/components/FoodPlaceDialog";
import { FoodPlaceVisitHistory } from "../../features/food/components/FoodPlaceVisitHistory";
import { FoodVisitHistory } from "../../features/food/components/FoodVisitHistory";
import {
  FoodPlaceEditor,
  type FoodPlaceFormValues,
} from "../../features/food/components/FoodPlaceEditor";
import { StarRating } from "../../features/food/components/StarRating";
import {
  useCheckInFoodPlace,
  useDeleteFoodPlace,
  useDeleteFoodPlaceVisit,
  useFoodPlaceVisitHistory,
  useFoodPlaces,
  useSaveFoodPlace,
} from "../../features/food/hooks/useFoodPlaces";
import {
  DEFAULT_FOOD_MARKER_COLOR,
  DEFAULT_FOOD_MARKER_ICON,
  type FoodCoordinate,
  type FoodPlace,
} from "../../features/food/types";
import "./food.css";

interface EditorState {
  id?: string;
  coordinate: FoodCoordinate | null;
  values: FoodPlaceFormValues;
}

const emptyValues: FoodPlaceFormValues = {
  name: "",
  address: "",
  note: "",
  rating: 0,
  markerIcon: DEFAULT_FOOD_MARKER_ICON,
  markerColor: DEFAULT_FOOD_MARKER_COLOR,
  mediaIds: [],
};

function toEditorState(place: FoodPlace): EditorState {
  return {
    id: place.id,
    coordinate: { latitude: place.latitude, longitude: place.longitude },
    values: {
      name: place.name,
      address: place.address,
      note: place.note,
      rating: place.rating,
      markerIcon: place.markerIcon,
      markerColor: place.markerColor,
      mediaIds: [...place.mediaIds],
    },
  };
}

export function FoodPage() {
  const { t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const home = useHomeLocation(user?.id);
  const query = useFoodPlaces();
  const save = useSaveFoodPlace();
  const remove = useDeleteFoodPlace();
  const checkInMutation = useCheckInFoodPlace();
  const removeVisitMutation = useDeleteFoodPlaceVisit();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "history">("map");
  const viewRequestRef = useRef(0);
  const [viewLoading, setViewLoading] = useState(false);
  const pageTransition = readPageTransitionEffect();
  useEffect(() => () => { viewRequestRef.current += 1; }, []);
  const visitHistory = useFoodPlaceVisitHistory(view === "history");
  const [formError, setFormError] = useState<string | null>(null);
  const [placeToDelete, setPlaceToDelete] = useState<FoodPlace | null>(null);
  const [placeToMove, setPlaceToMove] = useState<{ place: FoodPlace; coordinate: FoodCoordinate } | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [manualHomePick, setManualHomePick] = useState(false);
  const [homeDialogOpen, setHomeDialogOpen] = useState(false);
  const [confirmHomeRemoval, setConfirmHomeRemoval] = useState(false);

  const places = query.data ?? [];
  const homePicking = manualHomePick;
  const selected = places.find((place) => place.id === selectedId);
  const canEdit = (place: FoodPlace) => place.owner.id === user?.id || isAdmin;
  const canChangeMarker = (place: FoodPlace) => canEdit(place) && !editor && !homePicking
    && !placeToMove && !placeToDelete && !save.isPending && !remove.isPending;
  const mapPlaces = useMemo(
    () => places.filter((place) => place.id !== placeToMove?.place.id
      && !(editor?.id === place.id && editor.coordinate)),
    [places, editor?.id, editor?.coordinate, placeToMove?.place.id],
  );
  const rated = places.filter((place) => place.rating > 0).length;
  const clearPreview = useCallback(() => {
    if (document.activeElement instanceof HTMLElement
      && document.activeElement.closest(".food__marker")) document.activeElement.blur();
    setSelectedId(null);
  }, []);

  useEffect(() => {
    if (!selectedId || editor || save.isPending || remove.isPending) return;
    const dismissPreview = (event: MouseEvent) => {
      if (!(event.target instanceof Element)
        || document.querySelector('[role="dialog"], [role="alertdialog"]')
        || event.target.closest(".food__marker, .food__card, .food__map-home-control, .map-navigation")) return;
      clearPreview();
    };
    document.addEventListener("click", dismissPreview);
    return () => document.removeEventListener("click", dismissPreview);
  }, [selectedId, editor, save.isPending, remove.isPending, clearPreview]);

  const pickHome = async (coordinate: FoodCoordinate) => {
    try {
      await home.save.mutateAsync(coordinate);
      setManualHomePick(false);
      showToast.success(t("Home location saved."));
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not save your home location."));
    }
  };

  const cancelHomePick = () => {
    setManualHomePick(false);
  };

  const startHomePick = () => {
    setHomeDialogOpen(false);
    setManualHomePick(true);
  };

  const openHomeDialog = () => {
    setHomeDialogOpen(true);
    void home.query.refetch();
  };

  const removeHomeLocation = async () => {
    await home.clear.mutateAsync();
    showToast.success(t("Home location removed."));
  };

  const checkIn = async (place: FoodPlace) => {
    try {
      await checkInMutation.mutateAsync(place.id);
      showToast.success(t("Visit saved."));
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not check in at this food place."));
    }
  };

  const removeVisit = async (visit: { id: string }) => {
    try {
      await removeVisitMutation.mutateAsync(visit.id);
      showToast.success(t("Check in removed."));
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not remove this check in."));
    }
  };

  const startEdit = (place: FoodPlace) => {
    setSelectedId(place.id);
    setFormError(null);
    setEditor(toEditorState(place));
  };

  const selectPlace = (place: FoodPlace) => {
    if (editor && editor.id !== place.id) return;
    setSelectedId(place.id);
  };

  /** Moves a draft marker or starts a new place at the selected map point. */
  const pickOnMap = (coordinate: FoodCoordinate, placeName?: string, source?: "search") => {
    if (!editor) {
      if (selectedId && source !== "search") {
        clearPreview();
        return;
      }
      setSelectedId(null);
      setFormError(null);
      setEditor({ coordinate, values: { ...emptyValues, name: placeName ?? "" } });
      return;
    }
    setEditor((current) => {
      if (!current) return current;
      const name = !current.values.name.trim() && placeName ? placeName : current.values.name;
      return { ...current, coordinate, values: { ...current.values, name } };
    });
  };

  const cancelMapPick = () => {
    setEditor(null);
    setFormError(null);
  };

  useEffect(() => {
    const cancel = () => {
      if (save.isPending || remove.isPending || home.save.isPending) return;
      cancelMapPick();
      setManualHomePick(false);
      clearPreview();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented
        || document.querySelector('[role="dialog"], [role="alertdialog"], .food__scenes[open]')) return;
      cancel();
    };
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)
        || document.querySelector('[role="dialog"], [role="alertdialog"]')
        || workspaceRef.current?.contains(event.target)
        || (event.target instanceof Element && event.target.closest(".food__notice"))) return;
      if (editor || manualHomePick) cancel();
    };
    window.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
    };
  }, [editor, manualHomePick, save.isPending, remove.isPending, home.save.isPending, clearPreview]);

  const movePlace = (place: FoodPlace, coordinate: FoodCoordinate) => {
    if (!canChangeMarker(place)) return;
    clearPreview();
    setPlaceToMove({ place, coordinate });
  };

  const deletePlace = (place: FoodPlace) => {
    if (!canChangeMarker(place)) return;
    clearPreview();
    setPlaceToDelete(place);
  };

  const confirmMove = async () => {
    if (!placeToMove) return;
    const { place, coordinate } = placeToMove;
    await save.mutateAsync({
      id: place.id,
      input: { ...toEditorState(place).values, ...coordinate },
    });
    showToast.success(t("Food place updated."));
  };

  const submit = async () => {
    if (!editor?.coordinate) return;
    const name = editor.values.name.trim();
    if (!name) {
      setFormError(t("Enter a name for this place."));
      return;
    }

    setFormError(null);
    try {
      const saved = await save.mutateAsync({
        id: editor.id,
        input: {
          ...editor.values,
          name,
          address: editor.values.address.trim(),
          note: editor.values.note.trim(),
          latitude: editor.coordinate.latitude,
          longitude: editor.coordinate.longitude,
        },
      });
      setEditor(null);
      setSelectedId(editor.id ? saved.id : null);
      showToast.success(t(editor.id ? "Food place updated." : "Food place saved."));
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("Could not save this food place."));
    }
  };

  const confirmDelete = async () => {
    if (!placeToDelete) return;
    await remove.mutateAsync(placeToDelete.id);
    if (selectedId === placeToDelete.id) setSelectedId(null);
    if (editor?.id === placeToDelete.id) setEditor(null);
    showToast.success(t("Food place deleted."));
  };

  const viewSwitch = (
    <div className="food__view-switch" role="group" aria-label={t("Food place view")}>
              <Button
                type="button"
                variant={view === "map" ? "primary" : "secondary"}
                aria-pressed={view === "map"}
                onClick={() => { viewRequestRef.current += 1; setViewLoading(false); startTransition(() => setView("map")); }}
              >
                {t("Map")}
              </Button>
              <Button
                type="button"
                variant={view === "history" ? "primary" : "secondary"}
                aria-pressed={view === "history"}
                onClick={() => {
                  if (view === "history") return;
                  const request = ++viewRequestRef.current;
                  setViewLoading(true);
                  void visitHistory.refetch().then(() => {
                    if (request !== viewRequestRef.current) return;
                    setViewLoading(false);
                    startTransition(() => setView("history"));
                  });
                }}
              >
                {t("History")}
              </Button>
            </div>
  );

  return (
    <main className="food">
      <ScrollProgressProvider>
        <div className="food__scroll-track" aria-hidden="true">
          <ScrollProgress mode="scaleX" className="food__scroll-progress" />
        </div>
        <ScrollProgressContainer className="food__content">
          <div className="food__scroll-inner">
            <header className="food__header">
              <div>
                <p className="food__eyebrow">{t("Travel")}</p>
                <h1>{t("Food")}<span className="brand__dot">.</span></h1>
                <p>{t("Save the places you ate at, rate them, and keep your notes on the map.")}</p>
              </div>
            </header>
            {editor && !editor.coordinate && (
              <div className="food__notice" role="status">
                <span>{t("Click the map, use your current location, or select a place label to set the marker.")}</span>
                <Button type="button" variant="secondary" onClick={cancelMapPick}>
                  {t("Cancel")}
                </Button>
              </div>
            )}
            {manualHomePick && (
              <div className="food__notice" role="status">
                <span>{t("Click the map to set your home location.")}</span>
                <Button type="button" variant="secondary" disabled={home.save.isPending} onClick={cancelHomePick}>
                  {t("Cancel")}
                </Button>
              </div>
            )}

            <div className="food__view-content" aria-busy={viewLoading || undefined}>
            <PageTransition effect={pageTransition} transitionKey={view}>
            {view === "history" ? (
              <div className="food__history-panel">
                {viewSwitch}
                {visitHistory.isError ? (
                  <ErrorState
                    message={t("Could not load visit history.")}
                    onRetry={() => void visitHistory.refetch()}
                  />
                ) : visitHistory.isPending ? <Spinner /> : visitHistory.data?.length ? (
                  <FoodVisitHistory
                    visits={visitHistory.data}
                    onRemove={(visit) => void removeVisit(visit)}
                    removingVisitId={removeVisitMutation.isPending ? removeVisitMutation.variables : null}
                  />
                ) : (
                  null
                )}
              </div>
            ) : query.isLoading ? <><Spinner />{viewSwitch}</> : query.isError && !places.length ? (
              <><ErrorState message="Could not load food places." onRetry={() => void query.refetch()} />{viewSwitch}</>
            ) : (
              <>
                <div ref={workspaceRef} className="food__workspace">
                  <div className="food__map-panel">
                    <FoodMap
                      places={mapPlaces}
                      selectedId={selectedId}
                      draft={placeToMove?.coordinate ?? editor?.coordinate ?? null}
                      draftIcon={placeToMove?.place.markerIcon ?? editor?.values.markerIcon ?? DEFAULT_FOOD_MARKER_ICON}
                      draftColor={placeToMove?.place.markerColor ?? editor?.values.markerColor ?? DEFAULT_FOOD_MARKER_COLOR}
                      picking={!!editor}
                      homeLocation={home.query.data ?? null}
                      homeLocationReady={home.query.isFetched}
                      homeActionDisabled={save.isPending || remove.isPending || home.save.isPending}
                      homePicking={homePicking}
                      onSelect={selectPlace}
                      canChange={canChangeMarker}
                      onMove={movePlace}
                      onDelete={deletePlace}
                      onPickHome={(coordinate) => void pickHome(coordinate)}
                      onHomeClick={() => {
                        setSelectedId(null);
                        setEditor(null);
                        setFormError(null);
                        setManualHomePick(false);
                        if (!home.query.data) openHomeDialog();
                      }}
                      onPick={pickOnMap}
                    />
                  </div>
                </div>
                {viewSwitch}
                {!places.length ? (
                  <EmptyState title="No food places yet" hint="Click the map or use your current location to add your first place." />
                ) : (
                  <>
                    <div className="food__library-header">
                      <h2>{t("Places")} <span>{t("{rated} of {total} rated", { rated, total: places.length })}</span></h2>
                    </div>
                    <ul className="food__list">
                      {places.map((place) => (
                        <li key={place.id}>
                          <button
                            type="button"
                            className="food__card"
                            aria-pressed={selectedId === place.id}
                            disabled={!!editor && editor.id !== place.id}
                            onClick={() => selectPlace(place)}
                          >
                            <span
                              className="food__chip"
                              style={{ "--marker-color": place.markerColor } as CSSProperties}
                              aria-hidden="true"
                            >
                              {place.markerIcon}
                            </span>
                            <span className="food__card-body">
                              <strong>{place.name}</strong>
                              {place.address && <small>{place.address}</small>}
                              <StarRating value={place.rating} size="sm" />
                              {place.note && <small>{place.note}</small>}
                              <small className="food__card-owner">{place.owner.username}</small>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}

            </PageTransition>
            </div>

            {editor?.coordinate && (
              <FoodPlaceDialog
                title={t(editor.id ? "Edit food place" : "New food place")}
                className="food__dialog--editor"
                closeDisabled={save.isPending}
                onClose={() => {
                  if (!save.isPending) {
                    setEditor(null);
                    setFormError(null);
                  }
                }}
              >
                <FoodPlaceEditor
                  values={editor.values}
                  coordinate={editor.coordinate}
                  saving={save.isPending}
                  isNew={!editor.id}
                  error={formError}
                  onChange={(values) => setEditor((current) => current ? { ...current, values } : current)}
                  onSubmit={() => void submit()}
                  onCancel={() => { setEditor(null); setFormError(null); }}
                />
              </FoodPlaceDialog>
            )}

            {selected && !editor && (
              <FoodPlaceDialog
                className="food__dialog--details"
                title={selected.name}
                subtitle={t("Added by {username}", { username: selected.owner.username })}
                icon={
                  <span
                    className="food__chip"
                    style={{ "--marker-color": selected.markerColor } as CSSProperties}
                    aria-hidden="true"
                  >
                    {selected.markerIcon}
                  </span>
                }
                onClose={() => setSelectedId(null)}
              >
                <div>
                  {selected.address && <p className="food__address">{selected.address}</p>}
                  <div className="food__details-rating">
                    <StarRating value={selected.rating} filledOnly />
                    {selected.rating > 0 && (
                      <span className="food__details-rating-value" aria-hidden="true">
                        {`${selected.rating}/5`}
                      </span>
                    )}
                  </div>
                  {selected.mediaIds.length > 0 && (
                    <ul className="food__gallery" aria-label={t("Photos")}>
                      {selected.mediaIds.map((mediaId) => (
                        <li key={mediaId}>
                          <img src={mediaPreviewUrl(mediaId)} alt="" loading="lazy" />
                        </li>
                      ))}
                    </ul>
                  )}
                  {selected.note
                    ? <p className="food__note">{selected.note}</p>
                    : <p className="food__hint">{t("No note yet.")}</p>}
                  <div className="food__form-actions food__details-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      busy={checkInMutation.isPending}
                      onClick={() => void checkIn(selected)}
                    >
                      {t("Check in")}
                    </Button>
                    {canEdit(selected) && (
                      <Button variant="secondary" onClick={() => startEdit(selected)}>{t("Edit")}</Button>
                    )}
                  </div>
                  {!canEdit(selected) && (
                    <p className="food__hint">{t("Only the owner or an administrator can change this food place.")}</p>
                  )}
                  <FoodPlaceVisitHistory foodPlaceId={selected.id} />
                </div>
              </FoodPlaceDialog>
            )}

            {homeDialogOpen && (
              <FoodPlaceDialog
                title={t("Home location")}
                onClose={() => setHomeDialogOpen(false)}
              >
                <div className="food__home-dialog">
                  {home.query.isPending || home.query.isFetching ? (
                    <Spinner />
                  ) : home.query.isError ? (
                    <>
                      <p role="alert">{t("Could not load your home location. Add it manually or retry.")}</p>
                      <div className="food__form-actions">
                        <Button type="button" onClick={startHomePick}>{t("Add manually")}</Button>
                        <Button type="button" variant="secondary" onClick={() => void home.query.refetch()}>
                          {t("Retry")}
                        </Button>
                      </div>
                    </>
                  ) : home.query.data ? (
                    <>
                      <p className="food__coordinate-readout">
                        {home.query.data.latitude.toFixed(6)}, {home.query.data.longitude.toFixed(6)}
                      </p>
                      <div className="food__form-actions">
                        <Button
                          variant="secondary"
                          onClick={startHomePick}
                        >
                          {t("Change home location")}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            setHomeDialogOpen(false);
                            setConfirmHomeRemoval(true);
                          }}
                        >
                          {t("Remove home marker")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>{t("Home not set.")}</p>
                      <div className="food__form-actions">
                        <Button
                          onClick={startHomePick}
                        >
                          {t("Add now")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </FoodPlaceDialog>
            )}

            {placeToMove && (
              <ConfirmationDialog
                title="Move this food place?"
                onConfirm={confirmMove}
                onClose={() => setPlaceToMove(null)}
              >
                <p>{t("{name} will move to {latitude}, {longitude}.", {
                  name: placeToMove.place.name,
                  latitude: placeToMove.coordinate.latitude.toFixed(6),
                  longitude: placeToMove.coordinate.longitude.toFixed(6),
                })}</p>
              </ConfirmationDialog>
            )}
            {placeToDelete && (
              <ConfirmationDialog
                title="Delete this food place?"
                danger
                onConfirm={confirmDelete}
                onClose={() => setPlaceToDelete(null)}
              >
                <p>{t("{name} will be removed from the map.", { name: placeToDelete.name })}</p>
              </ConfirmationDialog>
            )}
            {confirmHomeRemoval && (
              <ConfirmationDialog
                title="Remove your home location?"
                danger
                onConfirm={removeHomeLocation}
                onClose={() => setConfirmHomeRemoval(false)}
              >
                <p>{t("The home marker will be removed. You can set it again later.")}</p>
              </ConfirmationDialog>
            )}
            <HomeLocationPhotoConfirmation
              location={home.photosHomeLocation}
              onConfirm={(location) => home.applyToPhotos.mutateAsync(location)}
              onClose={home.dismissPhotosConfirmation}
            />
          </div>
        </ScrollProgressContainer>
      </ScrollProgressProvider>
    </main>
  );
}
